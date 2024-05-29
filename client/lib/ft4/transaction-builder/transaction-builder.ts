import {
  Authenticator,
  FtKeyStore,
  FtSigner,
  isFtSigner,
  SigningError,
  isFtKeyStore,
  ftSigner,
} from "@ft4/authentication";
import {
  BufferId,
  OperationNotExistError,
  TxContext,
  compactArray,
  getBlockchainApiUrls,
  getDirectoryClient,
  getAuthDescriptorCounterIdForTxContext,
  getSystemAnchoringChain,
  getTransactionRid,
} from "@ft4/utils";
import { Buffer } from "buffer";
import {
  BlockAnchoringException,
  GTX,
  IClient,
  Operation,
  RawGtx,
  SignedTransaction,
  SystemChainException,
  TransactionReceipt,
  Web3PromiEvent,
  convertToRellOperation,
  createClient,
  createIccfProofTx,
  formatter,
  getAnchoringClient,
  getBlockAnchoringTransaction,
  gtv,
  gtx,
  isBlockAnchored,
} from "postchain-client";
import {
  AnchoringTimeoutError,
  AuthorizationError,
  OperationConfig,
  OperationContext,
  TransactionBuilder,
  TransactionBuilderConfig,
  TransactionWithReceipt,
} from "./types";
import { EMPTY_SIGNATURE, signOperation } from "./utils";

const defaultConfig: TransactionBuilderConfig = {
  retryCount: 40,
  waitTimeMs: 1000,
};

/**
 * Creates a new TransactionBuilder instance
 * @param authenticator object that holds authentication information for the transaction
 * @param client object that holds connection info for the transaction
 * @param config optional configuration
 * @returns a TransactionBuilder instance
 */
export function transactionBuilder(
  authenticator: Authenticator,
  client: IClient,
  config: TransactionBuilderConfig = defaultConfig,
): TransactionBuilder {
  const _operations: OperationContext[] = [];
  const _finalFtSigners: FtSigner[] = [];
  const _context: TxContext = {};
  let _directoryClient: IClient;
  let _clusterAnchoringClient: IClient;
  let _systemAnchoringChain: Buffer;

  function add(
    operation: Operation,
    config: OperationConfig = {},
  ): TransactionBuilder {
    _operations.push({
      operation,
      authenticator: config.authenticator ?? authenticator,
      onAnchoredHandler: config.onAnchoredHandler,
      signers: config.signers,
      targetBlockchainRid: config.targetBlockchainRid,
      skipFtSigning: config.skipFtSigning,
    });
    return me;
  }

  function addSigners(...signers: FtSigner[]): TransactionBuilder {
    signers.forEach((signer) => _finalFtSigners.push(signer));
    return me;
  }

  async function _buildUnsigned(): Promise<GTX> {
    const [operations, ftSigners] = await authenticateOperations(
      _operations,
      _context,
    );

    ftSigners.forEach((kh) => _finalFtSigners.push(kh));
    const signerPubKeys = _finalFtSigners.map(({ pubKey }) =>
      formatter.toString(pubKey),
    );
    const signers = [...new Set(signerPubKeys)].map(formatter.ensureBuffer);

    return {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: convertToRellOperation(operations),
      signers: signers,
      signatures: [],
    };
  }

  async function authenticateOperations(
    opContexts: OperationContext[],
    ctx: TxContext,
  ): Promise<[Operation[], FtSigner[]]> {
    const processedOperations: Operation[] = [];
    const ftSigners: FtSigner[] = [];
    let opIndex = 0;

    for (const opContext of opContexts) {
      const { operation, authenticator, signers, skipFtSigning } = opContext;
      if (
        !(await authenticator.authDataService.isOperationExposed(
          operation.name,
        ))
      ) {
        throw new OperationNotExistError(
          `Operation ${operation.name} does not exist`,
        );
      }

      if (operation.name === "nop") {
        processedOperations.push(operation);
        opContext.opIndex = opIndex;
        opIndex++;
        continue;
      }

      const keyHandler = await authenticator.getKeyHandlerForOperation(
        operation,
        ctx,
      );

      if (!keyHandler) {
        throw new AuthorizationError(
          `No key handler registered to handle operation <${operation.name}>`,
        );
      }

      let ops: Operation[];
      try {
        const authOps = await keyHandler.authorize(
          authenticator.accountId,
          operation,
          ctx,
          authenticator.authDataService,
        );

        // Add ft4.evm_signatures operation if needed
        ops = compactArray([
          signers &&
            (await signOperation(
              authOps,
              signers,
              authenticator.authDataService,
            )),
          ...authOps,
        ]);
      } catch (e) {
        throw new SigningError(`Unable to sign operation ${operation.name}`, e);
      }
      const counterId = getAuthDescriptorCounterIdForTxContext(
        authenticator.accountId,
        keyHandler.authDescriptor.id,
      );
      ctx[counterId] = (ctx[counterId] ?? 0) + 1;
      ops.forEach((op) => processedOperations.push(op));
      opIndex += ops.length;
      opContext.opIndex = opIndex - 1;

      if (isFtKeyStore(keyHandler.keyStore)) {
        ftSigners.push(
          skipFtSigning
            ? ftSigner(keyHandler.keyStore.id)
            : keyHandler.keyStore,
        );
      }

      if (signers) {
        signers
          .filter(isFtSigner)
          .forEach((store) =>
            ftSigners.push(skipFtSigning ? ftSigner(store.pubKey) : store),
          );
      }
    }

    return [processedOperations, ftSigners];
  }

  async function _build(): Promise<Buffer> {
    const tx: GTX = await _buildUnsigned();
    const signersMap = getSignersMap(_finalFtSigners.filter(isFtKeyStore));
    tx.signatures = await Promise.all(
      // For some signers we don't have access to their key stores, therefor we insert zero buffer
      // as a placeholder for their signatures
      tx.signers.map((signer) => {
        try {
          return (
            signersMap[signer.toString("hex")]?.sign(tx) ?? EMPTY_SIGNATURE
          );
        } catch (e) {
          throw new SigningError(
            `Unable to sign transaction for signer ${signer.toString("hex")}`,
            e,
          );
        }
      }),
    );
    return gtx.serialize(tx);
  }

  async function build(): Promise<Buffer> {
    if (_operations.find((op: OperationContext) => !!op.onAnchoredHandler))
      throw new Error(
        "Cannot build transaction with onAnchoredHandlers, use buildAndSendWithAnchoring() instead",
      );

    return await _build();
  }

  function buildAndSend(): Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  > {
    const promiEvent = new Web3PromiEvent<
      TransactionWithReceipt,
      {
        built: SignedTransaction;
        sent: Buffer;
      }
    >((resolve, reject) => {
      if (_operations.find((op: OperationContext) => !!op.onAnchoredHandler))
        reject(
          Error(
            "Cannot build transaction with onAnchoredHandlers, use buildAndSendWithAnchoring() instead",
          ),
        );

      _build()
        .then((tx) => {
          promiEvent.emit("built", tx);
          return Promise.all([
            tx,
            client.sendTransaction(tx).on("sent", (receipt) => {
              promiEvent.emit("sent", receipt.transactionRid);
            }),
          ]);
        })
        .then(([tx, receipt]) => {
          resolve({ tx, receipt });
        })
        .catch((reason) => reject(reason));
    });
    return promiEvent;
  }

  function buildAndSendWithAnchoring(): Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
      confirmed: TransactionReceipt;
    }
  > {
    const promiEvent = new Web3PromiEvent<
      TransactionWithReceipt,
      {
        built: SignedTransaction;
        sent: Buffer;
        confirmed: TransactionReceipt;
      }
    >((resolve, reject) => {
      _build()
        .then((tx) => {
          promiEvent.emit("built", tx);
          return Promise.all([
            tx,
            client
              .sendTransaction(tx)
              .on("sent", (receipt) =>
                promiEvent.emit("sent", receipt.transactionRid),
              ),
          ]);
        })
        .then(([tx, receipt]) => {
          promiEvent.emit("confirmed", receipt);
          return Promise.all([
            tx,
            receipt,
            handleAnchoring(tx, receipt.transactionRid),
          ]);
        })
        .then(([tx, receipt, isAnchored]) => {
          if (isAnchored) {
            resolve({
              tx,
              receipt,
            });
          } else {
            reject(new AnchoringTimeoutError());
          }
        })
        .catch((reason) => reject(reason));
    });
    return promiEvent;
  }

  async function handleAnchoring(
    tx: SignedTransaction,
    txRid: Buffer,
  ): Promise<boolean> {
    const operationsWithHandlers = _operations.filter(
      (op: OperationContext) => !!op.onAnchoredHandler,
    );

    const clusterAnchorTxRid = await waitUntilClusterAnchored(txRid);

    if (
      clusterAnchorTxRid &&
      (await waitUntilAnchoredInChain(
        await createClient({
          nodeUrlPool: client.config.endpointPool.map((ep) => ep.url),
          blockchainRid: formatter.toString(await ensureSystemAnchoringChain()),
        }),
        clusterAnchorTxRid,
      ))
    ) {
      const rawTx = gtv.decode(tx) as RawGtx;
      const createProof = createCreateProof(rawTx);

      const handlersWithoutChain = operationsWithHandlers.filter(
        (op) => !op.targetBlockchainRid,
      );
      const handlersByChain = new Map<string, OperationContext[]>();
      operationsWithHandlers
        .filter((op) => op.targetBlockchainRid)
        .forEach((op) => {
          const targetBlockchainRidHex = formatter.toString(
            op.targetBlockchainRid!,
          );
          if (!handlersByChain.has(targetBlockchainRidHex)) {
            handlersByChain.set(targetBlockchainRidHex, []);
          }
          handlersByChain.get(targetBlockchainRidHex)!.push(op);
        });

      invokeOnAnchoringHandlers(handlersWithoutChain, {
        rawTx,
        createProof,
      });

      for (const [targetBlockchainRidHex, ops] of handlersByChain) {
        const clientToSystemAnchoringChainReplicaInTargetChainCluster =
          await createClient({
            nodeUrlPool: await getBlockchainApiUrls(
              await ensureDirectoryClient(),
              formatter.toBuffer(targetBlockchainRidHex),
            ),
            blockchainRid: formatter.toString(
              await ensureSystemAnchoringChain(),
            ),
          });
        if (
          await waitUntilAnchoredInChain(
            clientToSystemAnchoringChainReplicaInTargetChainCluster,
            clusterAnchorTxRid,
          )
        ) {
          invokeOnAnchoringHandlers(ops, {
            rawTx,
            createProof,
          });
        } else {
          invokeOnAnchoringHandlers(ops, undefined);
        }
      }
      return true;
    } else {
      invokeOnAnchoringHandlers(operationsWithHandlers, undefined);
      return false;
    }
  }

  async function waitUntilClusterAnchored(
    txRid: Buffer,
  ): Promise<Buffer | null> {
    if (_clusterAnchoringClient === undefined) {
      _clusterAnchoringClient = await getAnchoringClient(
        await ensureDirectoryClient(),
        client.config.blockchainRid,
      );
    }

    for (let i = 0; i < config.retryCount; ++i) {
      await new Promise((resolve) => setTimeout(resolve, config.waitTimeMs));

      try {
        return (await getBlockAnchoringTransaction(
          client,
          _clusterAnchoringClient,
          txRid,
        ))!.txRid;
      } catch (error) {
        if (
          !(
            error instanceof BlockAnchoringException ||
            error instanceof SystemChainException
          )
        ) {
          throw error;
        }
      }
    }
    return null;
  }

  async function waitUntilAnchoredInChain(
    systemAnchoringClient: IClient,
    txRid: Buffer,
  ) {
    for (let i = 0; i < config.retryCount; ++i) {
      await new Promise((resolve) => setTimeout(resolve, config.waitTimeMs));

      try {
        if (
          await isBlockAnchored(
            _clusterAnchoringClient,
            systemAnchoringClient,
            txRid,
          )
        )
          return true;
      } catch (error) {
        if (
          !(
            error instanceof BlockAnchoringException ||
            error instanceof SystemChainException
          )
        ) {
          throw error;
        }
      }
    }
    return false;
  }

  function createCreateProof(
    rawTx: RawGtx,
  ): (blockchainRid: BufferId) => Promise<Operation> {
    const proofCache = new Map<string, Operation>();
    return async (blockchainRid: BufferId): Promise<Operation> => {
      if (proofCache.has(blockchainRid.toString("hex"))) {
        return proofCache.get(blockchainRid.toString("hex"))!;
      }

      const directoryClient = await ensureDirectoryClient();

      const proof = await createIccfProofTx(
        directoryClient,
        getTransactionRid(rawTx),
        gtv.gtvHash(rawTx),
        rawTx[0][2], // signers
        client.config.blockchainRid,
        blockchainRid.toString("hex"),
        undefined,
        true,
      );

      const iccfProofOperation = proof.iccfTx.operations[0];
      proofCache.set(blockchainRid.toString("hex"), iccfProofOperation);
      return iccfProofOperation;
    };
  }

  async function ensureDirectoryClient(): Promise<IClient> {
    if (_directoryClient === undefined) {
      _directoryClient = await getDirectoryClient(
        client.config.endpointPool.map((ep) => ep.url),
      );
    }
    return _directoryClient;
  }

  async function ensureSystemAnchoringChain(): Promise<Buffer> {
    if (_systemAnchoringChain === undefined) {
      _systemAnchoringChain = await getSystemAnchoringChain(
        await ensureDirectoryClient(),
      );
    }
    return _systemAnchoringChain;
  }

  function invokeOnAnchoringHandlers(
    operationsWithHandlers: OperationContext[],
    data:
      | {
          rawTx: RawGtx;
          createProof: (blockchainRid: BufferId) => Promise<Operation>;
        }
      | undefined,
  ) {
    if (data) {
      const { rawTx, createProof } = data;
      operationsWithHandlers.forEach((op: OperationContext) => {
        if (!op.onAnchoredHandler) return;
        op.onAnchoredHandler(
          {
            operation: op.operation,
            opIndex: op.opIndex!,
            tx: rawTx,
            createProof,
          },
          null,
        );
      });
    } else {
      operationsWithHandlers.forEach((op) => {
        if (!op.onAnchoredHandler) return;
        op.onAnchoredHandler(
          null,
          new AnchoringTimeoutError(
            "Block was not anchored within the specified timeout",
          ),
        );
      });
    }
  }

  function getSignersMap(stores: FtKeyStore[]) {
    return stores.reduce(
      (acc, curr: FtKeyStore) => ({
        [curr.pubKey.toString("hex")]: curr,
        ...acc,
      }),
      {},
    );
  }

  const me = Object.freeze({
    add,
    addSigners,
    build,
    buildAndSend,
    buildAndSendWithAnchoring,
    session: client,
  });

  return me;
}

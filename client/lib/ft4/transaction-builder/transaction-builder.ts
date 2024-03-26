import {
  Authenticator,
  KeyHandler,
  KeyStore,
  isFtKeyStore,
  FtKeyStore,
} from "@ft4/authentication";
import { SigningError } from "@ft4/authentication";
import { Buffer } from "buffer";
import {
  Operation,
  gtx,
  IClient,
  isBlockAnchored,
  getAnchoringClient,
  BlockAnchoringException,
  SignedTransaction,
  TransactionReceipt,
  createIccfProofTx,
  gtv,
  RawGtx,
  SystemChainException,
  GTX,
  Web3PromiEvent,
} from "postchain-client";
import { getBlockAnchoringTransaction } from "postchain-client";
import { formatter, createClient } from "postchain-client";
import {
  getNonceIdForTxContext,
  getTransactionRid,
  BufferId,
} from "@ft4/utils";
import { OperationNotExistError } from "@ft4/utils/errors";
import { TxContext } from "@ft4/utils/types";
import {
  AnchoringTimeoutError,
  AuthorizationError,
  OnAnchoredHandler,
  OperationContext,
  TransactionBuilder,
  TransactionBuilderConfig,
  TransactionWithReceipt,
} from "./types";
import { createNoopAuthenticator } from "@ft4/authentication/noop";
import { getSystemAnchoringChain } from "@ft4/utils/directory-chain";
import { getDirectoryClient } from "@ft4/utils/directory-chain";
import { getBlockchainApiUrls } from "@ft4/utils/directory-chain";
import { EMPTY_SIGNATURE } from "@ft4/transaction-builder/utils";

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
  const _keysUsed: (KeyStore | KeyHandler)[] = [];
  const _context: TxContext = {};
  let _noopAuthenticator: Authenticator;
  let _directoryClient: IClient;
  let _clusterAnchoringClient: IClient;
  let _systemAnchoringChain: Buffer;

  function add(
    operation: Operation,
    onAnchoredHandler?: OnAnchoredHandler,
  ): TransactionBuilder {
    _operations.push({
      operation,
      authenticator,
      onAnchoredHandler,
    });
    return me;
  }

  function addWithAuthenticator(
    operation: Operation,
    authenticator: Authenticator,
    onAnchoredHandler?: OnAnchoredHandler,
  ): TransactionBuilder {
    _operations.push({
      operation,
      authenticator,
      onAnchoredHandler,
    });
    return me;
  }

  function addWithoutAuthenticator(
    operation: Operation,
    onAnchoredHandler?: OnAnchoredHandler,
  ): TransactionBuilder {
    if (_noopAuthenticator === undefined) {
      _noopAuthenticator = createNoopAuthenticator(
        authenticator.authDataService,
      );
    }
    _operations.push({
      operation,
      authenticator: _noopAuthenticator,
      onAnchoredHandler,
    });
    return me;
  }

  function addWithAnchoring(
    operation: Operation,
    targetBlockchainRid: BufferId,
    onAnchoredHandler: OnAnchoredHandler,
  ): TransactionBuilder {
    _operations.push({
      operation,
      authenticator,
      targetBlockchainRid: formatter.ensureBuffer(targetBlockchainRid),
      onAnchoredHandler,
    });
    return me;
  }

  function addWithAnchoringWithAuthenticator(
    operation: Operation,
    authenticator: Authenticator,
    targetBlockchainRid: BufferId,
    onAnchoredHandler: OnAnchoredHandler,
  ): TransactionBuilder {
    _operations.push({
      operation,
      authenticator,
      targetBlockchainRid: formatter.ensureBuffer(targetBlockchainRid),
      onAnchoredHandler,
    });
    return me;
  }

  function addWithAnchoringWithoutAuthenticator(
    operation: Operation,
    targetBlockchainRid: BufferId,
    onAnchoredHandler: OnAnchoredHandler,
  ): TransactionBuilder {
    if (_noopAuthenticator === undefined) {
      _noopAuthenticator = createNoopAuthenticator(
        authenticator.authDataService,
      );
    }
    _operations.push({
      operation,
      authenticator: _noopAuthenticator,
      targetBlockchainRid: formatter.ensureBuffer(targetBlockchainRid),
      onAnchoredHandler,
    });
    return me;
  }

  function getSigners(keyHandlers: (KeyHandler | KeyStore)[]): Buffer[] {
    return keyHandlers
      .map((handler) =>
        isKeyHandler(handler)
          ? handler.getSigners()
          : isFtKeyStore(handler)
            ? [handler.pubKey]
            : [],
      )
      .flat();
  }

  function getFtKeyStores(
    keyHandlers: (KeyHandler | KeyStore)[],
  ): FtKeyStore[] {
    return keyHandlers
      .map((handler) => (isKeyHandler(handler) ? handler.keyStore : handler))
      .map((store) => (isFtKeyStore(store) ? store : null))
      .filter((store): store is FtKeyStore => !!store);
  }

  async function _buildUnsigned(): Promise<GTX> {
    const [operations, keyHandlers] = await authenticateOperations(
      _operations,
      _context,
    );

    keyHandlers.forEach((kh) => _keysUsed.push(kh));

    return {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: operations.map((op: Operation) => ({
        opName: op.name,
        args: op.args ?? [],
      })),
      signers: getSigners(_keysUsed),
      signatures: [],
    };
  }

  async function authenticateOperations(
    opContexts: OperationContext[],
    ctx: TxContext,
  ): Promise<[Operation[], KeyHandler[]]> {
    const processedOperations: Operation[] = [];
    const keyHandlers: KeyHandler[] = [];
    let opIndex = 0;

    for (const opContext of opContexts) {
      const { operation, authenticator } = opContext;
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
      keyHandlers.push(keyHandler);
      let ops: Operation[];
      try {
        ops = await keyHandler.authorize(
          authenticator.accountId,
          operation,
          ctx,
          authenticator.authDataService,
        );
      } catch (e) {
        throw new SigningError(`Unable to sign operation ${operation.name}`, e);
      }
      const nonceId = getNonceIdForTxContext(
        authenticator.accountId,
        keyHandler.authDescriptor.id,
      );
      ctx[nonceId] = (ctx[nonceId] ?? 0) + 1;
      ops.forEach((op) => processedOperations.push(op));
      opIndex += ops.length;
      opContext.opIndex = opIndex - 1;
    }
    return [processedOperations, keyHandlers];
  }

  async function build(): Promise<Buffer> {
    if (_operations.find((op: OperationContext) => !!op.onAnchoredHandler))
      throw new Error(
        "Cannot build transaction with onAnchoredHandlers, use buildAndSendWithAnchoring() instead",
      );

    return await _build();
  }

  function addSigners(...signers: FtKeyStore[]): TransactionBuilder {
    signers.forEach((signer) => _keysUsed.push(signer));
    return me;
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

  async function _build(): Promise<Buffer> {
    const tx: GTX = await _buildUnsigned();
    const signersMap = getSignersMap(getFtKeyStores(_keysUsed));
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
    addWithAuthenticator,
    addWithoutAuthenticator,
    addWithAnchoring,
    addWithAnchoringWithAuthenticator,
    addWithAnchoringWithoutAuthenticator,
    addSigners,
    build,
    buildAndSend,
    buildAndSendWithAnchoring,
    session: client,
  });

  return me;
}

const isKeyHandler = (handler: KeyHandler | KeyStore): handler is KeyHandler =>
  (handler as KeyStore).id === undefined;

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
  OperationNotExistError,
  TxContext,
  compactArray,
  getAuthDescriptorCounterIdForTxContext,
  getSystemAnchoringChain,
  getTransactionRid,
} from "@ft4/utils";
import { Buffer } from "buffer";
import {
  AnchoringStatus,
  ChainConfirmationLevel,
  GTX,
  IClient,
  Operation,
  RawGtx,
  ResponseStatus,
  SignedTransaction,
  TransactionReceipt,
  convertToRellOperation,
  createIccfProofTx,
  formatter,
  getAnchoringClient,
  getSystemClient,
  gtv,
  gtx,
} from "postchain-client";
import {
  AuthorizationError,
  OperationConfig,
  OperationContext,
  TransactionBuilder,
  TransactionWithReceipt,
} from "./types";
import { EMPTY_SIGNATURE, signOperation } from "./utils";
import { Web3CustomPromiEvent } from "@ft4/utils/promiEvent";

/**
 * Creates a new TransactionBuilder instance
 * @param authenticator - object that holds authentication information for the transaction
 * @param client - object that holds connection info for the transaction
 * @returns a TransactionBuilder instance
 */
export function transactionBuilder(
  authenticator: Authenticator,
  client: IClient,
): TransactionBuilder {
  const _operations: OperationContext[] = [];
  const _finalFtSigners: FtSigner[] = [];
  const _context: TxContext = {};

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

  function buildAndSend(): Web3CustomPromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  > {
    const promiEvent = new Web3CustomPromiEvent<
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

  function buildAndSendWithAnchoring(): Web3CustomPromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
      confirmed: TransactionReceipt;
    }
  > {
    const promiEvent = new Web3CustomPromiEvent<
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
          return client
            .sendTransaction(
              tx,
              true,
              () => {},
              ChainConfirmationLevel.SystemAnchoring,
            )
            .on("sent", (receipt) => {
              if (receipt.status === ResponseStatus.Waiting) {
                promiEvent.emit("sent", receipt.transactionRid);
              }

              if (receipt.status === ResponseStatus.Confirmed) {
                promiEvent.emit("confirmed", receipt);
              }
            })
            .then((receipt) => {
              if (receipt.status === AnchoringStatus.SystemAnchored) {
                // let rawSourceTx: RawGtx;
                // if (Buffer.isBuffer(receipt.clusterAnchoredTx?.txData)) {
                //    as RawGtx;
                // }
                // rawSourceTx = gtv.decode(
                //   tx,
                // );
                const systemConfirmationProof = getSystemAnchoringIccfProofOp(
                  client,
                  gtv.decode(tx) as RawGtx,
                );
                resolve({ tx, receipt, systemConfirmationProof });
              }
            });
        })
        .catch((reason) => reject(reason));
    });

    return promiEvent;
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

export function getSystemAnchoringIccfProofOp(
  client: IClient,
  rawSourceTx: RawGtx,
): () => Promise<Operation> {
  return async (): Promise<Operation> => {
    const directoryClient = await getSystemClient(
      client.config.endpointPool.map((endpoint) => endpoint.url),
      client.config.directoryChainRid,
    );
    const anchoringClient = await getAnchoringClient(
      directoryClient,
      client.config.blockchainRid,
    );

    const systemAnchoringChainRid =
      await getSystemAnchoringChain(directoryClient);

    const proofTx = await createIccfProofTx(
      directoryClient,
      getTransactionRid(rawSourceTx),
      gtv.gtvHash(rawSourceTx),
      rawSourceTx[0][2], // signers
      anchoringClient.config.blockchainRid,
      systemAnchoringChainRid.toString("hex"),
      undefined,
      true,
    );

    const iccfProofOperation = proofTx.iccfTx.operations[0];

    return iccfProofOperation;
  };
}

import {
  Authenticator,
  FtKeyStore,
  FtSigner,
  isFtSigner,
  SigningError,
  isFtKeyStore,
  ftSigner,
  noopAuthenticator,
} from "@ft4/authentication";
import {
  TxContext,
  compactArray,
  getAuthDescriptorCounterIdForTxContext,
  getTransactionRid,
} from "@ft4/utils";
import { Buffer } from "buffer";
import {
  BufferId,
  ChainConfirmationLevel,
  GTX,
  IClient,
  IccfProof,
  Operation,
  SignedTransaction,
  TransactionEvent,
  TransactionReceipt,
  Web3PromiEvent,
  convertToRellOperation,
  createIccfProofTx,
  formatter,
  getSystemClient,
  gtx,
} from "postchain-client";
import {
  AnchoringTransactionWithReceipt,
  AuthorizationError,
  OperationConfig,
  OperationContext,
  TransactionBuilder,
  TransactionWithReceipt,
} from "./types";
import { EMPTY_SIGNATURE, signOperation } from "./utils";

/**
 * Creates a new TransactionBuilder instance
 * @param authenticator - object that holds authentication information for the transaction. Can be null for operations that don't require authentication.
 * @param client - object that holds connection info for the transaction
 * @returns a TransactionBuilder instance
 */
export function transactionBuilder(
  authenticator: Authenticator | null,
  client: IClient,
): TransactionBuilder {
  const _operations: OperationContext[] = [];
  const _finalFtSigners: FtSigner[] = [];
  const _context: TxContext = {};
  const _defaultAuthenticator = authenticator ?? noopAuthenticator;

  function add(
    operation: Operation,
    config: OperationConfig = {},
  ): TransactionBuilder {
    _operations.push({
      operation,
      authenticator: config.authenticator ?? _defaultAuthenticator,
      signers: config.signers,
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

      // If no key handler is returned, check if the operation requires authentication
      if (!keyHandler) {
        const authHandler =
          await authenticator.authDataService.getAuthHandlerForOperation(
            operation.name,
          );

        // If no auth handler is returned, the operation doesn't require authentication,In this case, we just add the operation without any auth operations
        if (!authHandler) {
          processedOperations.push(operation);
          opContext.opIndex = opIndex;
          opIndex++;
          continue;
        }

        // The operation requires authentication but no key handler can handle it, this is an authorization error
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
            signersMap[signer.toString("hex")]?.sign(tx, client) ??
            EMPTY_SIGNATURE
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
      _build()
        .then((tx) => {
          promiEvent.emit("built", tx);
          const proof = _operations.find(
            (op) => op.operation.name === "iccf_proof",
          );
          let txPromiEvent;
          if (proof) {
            txPromiEvent = client.sendTransactionWithRetries(tx);
          } else {
            txPromiEvent = client.sendTransaction(tx);
          }
          return Promise.all([
            tx,
            txPromiEvent.on(TransactionEvent.DappReceived, (receipt) => {
              promiEvent.emit("sent", receipt.transactionRid);
            }),
          ]);
        })
        .then(([tx, receipt]) => {
          resolve({ tx: gtx.deserialize(tx), receipt });
        })
        .catch((reason) => reject(reason));
    });
    return promiEvent;
  }

  function buildAndSendWithAnchoring(): Web3PromiEvent<
    AnchoringTransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
      confirmed: TransactionReceipt;
    }
  > {
    const promiEvent = new Web3PromiEvent<
      AnchoringTransactionWithReceipt,
      {
        built: SignedTransaction;
        sent: Buffer;
        confirmed: TransactionReceipt;
      }
    >((resolve, reject) => {
      _build()
        .then((tx) => {
          promiEvent.emit("built", tx);
          const proof = _operations.find(
            (op) => op.operation.name === "iccf_proof",
          );
          let txPromiEvent;
          if (proof) {
            txPromiEvent = client.sendTransactionWithRetries(
              tx,
              () => {},
              ChainConfirmationLevel.SystemAnchoring,
            );
          } else {
            txPromiEvent = client.sendTransaction(
              tx,
              true,
              () => {},
              ChainConfirmationLevel.SystemAnchoring,
            );
          }
          return txPromiEvent
            .on(TransactionEvent.DappReceived, (receipt) =>
              promiEvent.emit("sent", receipt.transactionRid),
            )
            .on(TransactionEvent.DappConfirmed, (receipt) =>
              promiEvent.emit("confirmed", receipt),
            )
            .then((receipt) => {
              const decodedTx = gtx.deserialize(tx);
              const systemConfirmationProof = getSystemAnchoringIccfProofOp(
                client,
                decodedTx,
              );
              if (!systemConfirmationProof) {
                throw new Error("Failed to get system confirmation proof");
              }
              resolve({ tx: decodedTx, receipt, systemConfirmationProof });
            });
        })
        .catch((reason) => reject(reason));
    });

    return promiEvent;
  }

  function getSignersMap(stores: FtKeyStore[]): Record<string, FtKeyStore> {
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

/**
 * The function `getSystemAnchoringIccfProofOp` should be utilized to retrieve a system anchoring proof operation
 * for a given transaction. The `txToProve` must be a cluster anchored transaction
 *
 * @param client - the client to use to get the system anchoring proof
 * @param txToProve - the transaction to prove
 * @returns a function that returns a promise of an operation
 */
export function getSystemAnchoringIccfProofOp(
  client: IClient,
  txToProve: GTX,
): (targetChainRid: Buffer) => Promise<Operation> {
  return async (targetChainRid: BufferId): Promise<Operation> => {
    const directoryClient = await getSystemClient(
      client.config.endpointPool.map((endpoint) => endpoint.url),
      client.config.directoryChainRid,
    );
    let proofTx: IccfProof | null = null;
    proofTx = await createIccfProofTx(
      directoryClient,
      getTransactionRid(txToProve, client),
      gtx.getDigest(txToProve, client.config.merkleHashVersion),
      txToProve.signers,
      client.config.blockchainRid,
      targetChainRid.toString("hex"),
      undefined,
      true,
      client.config.merkleHashVersion,
      client.config.nodeManager.lastUsedNode?.url,
    );

    const iccfProofOperation = proofTx.iccfTx.operations[0];

    return iccfProofOperation;
  };
}

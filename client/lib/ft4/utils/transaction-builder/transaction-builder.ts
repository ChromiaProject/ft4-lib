import {
  Authenticator,
  KeyHandler,
  KeyStore,
  isFtKeyStore,
  FtKeyStore,
} from "@ft4/authentication";
import { Buffer } from "buffer";
import {
  Operation,
  gtx,
  IClient,
  isBlockAnchored,
  getAnchoringClient,
  createClient,
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
import {
  getNonceIdForTxContext,
  getTransactionRid,
  BufferId,
} from "@ft4/utils";
import { OperationNotExistError } from "../errors";
import { TxContext } from "../types";
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
import { AnchoringTransaction } from "postchain-client";
import { getBlockAnchoringTransaction } from "postchain-client";
import { formatter } from "postchain-client";

const defaultConfig: TransactionBuilderConfig = {
  retryCount: 10,
  waitTimeMs: 500,
};

/**
 * Creates a new TransactionBuilder instance
 * @param authenticator object that holds authentication information for the transaction
 * @param client object that holds connection info for the transaction
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
  let _systemAnchoringClient: IClient;

  function add(
    operation: Operation,
    onAnchoredHandler?: OnAnchoredHandler,
  ): TransactionBuilder {
    _operations.push({ operation, authenticator, onAnchoredHandler });
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

  async function buildUnsigned(): Promise<GTX> {
    if (_operations.find((op: OperationContext) => !!op.onAnchoredHandler))
      throw new Error(
        "Cannot build transaction with onAnchoredHandlers, use buildAndSendWithAnchoring() instead",
      );

    return await _buildUnsigned();
  }

  async function _buildUnsigned(): Promise<GTX> {
    const [operations, keyHandlers] = await authenticateOperations(
      _operations,
      _context,
    );

    keyHandlers.forEach((kh) => _keysUsed.push(kh));

    const txn: GTX = {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: [],
      signers: getSigners(_keysUsed),
      signatures: [],
    };

    const addOperation = (op: Operation) => {
      txn.operations.push({ opName: op.name, args: op.args ?? [] });
    };

    operations.forEach((op: Operation | Operation[]) => {
      Array.isArray(op) ? op.forEach(addOperation) : addOperation(op);
    });
    return txn;
  }

  async function authenticateOperations(
    opContexts: OperationContext[],
    ctx: TxContext,
  ): Promise<[Operation[], KeyHandler[]]> {
    const keyHandlers: KeyHandler[] = [];
    const processedOperations: Operation[][] = [];

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
        processedOperations.push([operation]);
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
      const ops = await keyHandler.authorize(
        authenticator.accountId,
        operation,
        ctx,
        authenticator.authDataService,
      );
      const nonceId = getNonceIdForTxContext(
        authenticator.accountId,
        keyHandler.authDescriptor.id,
      );
      ctx[nonceId] = (ctx[nonceId] ?? 0) + 1;
      processedOperations.push(ops);
    }
    let opsToReturn: Operation[] = [];
    processedOperations.forEach((item) => {
      opsToReturn = Array.isArray(item)
        ? opsToReturn.concat(item)
        : [...opsToReturn, item];
    });
    return [opsToReturn, keyHandlers];
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
          return Promise.all([tx, receipt, waitUntilAnchored(tx)]);
        })
        .then(([tx, receipt, rawTx]) => {
          const operationsWithHandlers = _operations.filter(
            (op: OperationContext) => !!op.onAnchoredHandler,
          );
          if (operationsWithHandlers.length) {
            if (rawTx) {
              const createProof = createCreateProof(tx, rawTx);
              invokeOnAnchoringHandlers(operationsWithHandlers, {
                rawTx,
                createProof,
              });
            } else {
              invokeOnAnchoringHandlers(operationsWithHandlers, undefined);
            }
          }

          if (rawTx) {
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

  async function waitUntilAnchored(
    tx: SignedTransaction,
  ): Promise<RawGtx | null> {
    if (_directoryClient === undefined) {
      _directoryClient = await createClient({
        nodeUrlPool: client.config.endpointPool.map((ep) => ep.url),
        blockchainIid: 0,
      });
    }
    if (_clusterAnchoringClient === undefined) {
      _clusterAnchoringClient = await getAnchoringClient(
        _directoryClient,
        client.config.blockchainRid,
      );
    }
    const rawTx = gtv.decode(tx) as RawGtx;
    const txRid = getTransactionRid(rawTx);

    let clusterAnchoringTransaction: AnchoringTransaction | null = null;
    for (let i = 0; i < config.retryCount; ++i) {
      await new Promise((resolve) => setTimeout(resolve, config.waitTimeMs));

      try {
        clusterAnchoringTransaction = await getBlockAnchoringTransaction(
          client,
          _clusterAnchoringClient,
          txRid,
        );
      } catch (error) {
        if (
          error instanceof BlockAnchoringException ||
          error instanceof SystemChainException
        ) {
          clusterAnchoringTransaction = null;
        } else {
          throw error;
        }
      }

      if (clusterAnchoringTransaction) break;
    }

    let isAnchored = false;
    if (clusterAnchoringTransaction) {
      if (_systemAnchoringClient === undefined) {
        const systemAnchoringChain =
          await getSystemAnchoringChain(_directoryClient);
        _systemAnchoringClient = await createClient({
          nodeUrlPool: client.config.endpointPool.map((ep) => ep.url),
          blockchainRid: formatter.toString(systemAnchoringChain),
        });
      }

      for (let i = 0; i < config.retryCount; ++i) {
        await new Promise((resolve) => setTimeout(resolve, config.waitTimeMs));

        try {
          isAnchored = await isBlockAnchored(
            _clusterAnchoringClient,
            _systemAnchoringClient,
            clusterAnchoringTransaction.txRid,
          );
        } catch (error) {
          if (
            error instanceof BlockAnchoringException ||
            error instanceof SystemChainException
          ) {
            isAnchored = false;
          } else {
            throw error;
          }
        }

        if (isAnchored) break;
      }
    }

    if (isAnchored) {
      return rawTx;
    } else {
      return null;
    }
  }

  function createCreateProof(
    tx: Buffer,
    rawTx: RawGtx,
  ): (blockchainRid: BufferId) => Promise<Operation> {
    const proofCache = new Map<string, Operation>();
    return async (blockchainRid: BufferId): Promise<Operation> => {
      if (proofCache.has(blockchainRid.toString("hex"))) {
        return proofCache.get(blockchainRid.toString("hex"))!;
      }

      const txRid = getTransactionRid(rawTx);

      for (let i = 0; i < config.retryCount; ++i) {
        await new Promise((resolve) => setTimeout(resolve, config.waitTimeMs));
        try {
          const proof = await createIccfProofTx(
            _directoryClient,
            txRid,
            tx,
            rawTx[0][2], // signers
            client.config.blockchainRid,
            blockchainRid.toString("hex"),
            undefined,
            true,
          );

          const iccfProofOperation = proof.iccfTx.operations[0];
          proofCache.set(blockchainRid.toString("hex"), iccfProofOperation);
          return iccfProofOperation;
        } catch (err) {
          console.log(err);
          throw err;
        }
      }
      throw new Error("Block was not properly anchored");
    };
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
      operationsWithHandlers.forEach((op: OperationContext, idx: number) => {
        if (!op.onAnchoredHandler) return;
        op.onAnchoredHandler(
          {
            operation: op.operation,
            opIndex: idx,
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
      tx.signers.map(
        (signer) =>
          signersMap[signer.toString("hex")]?.sign(tx) ?? Buffer.alloc(64),
      ),
    );
    return gtx.serialize(tx);
  }

  function addWithAuthenticator(
    operation: Operation,
    authenticator: Authenticator,
    onAnchoredHandler?: OnAnchoredHandler,
  ): TransactionBuilder {
    _operations.push({ operation, authenticator, onAnchoredHandler });
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
    addSigners,
    build,
    buildUnsigned,
    buildAndSend,
    buildAndSendWithAnchoring,
    session: client,
  });

  return me;
}

const isKeyHandler = (handler: KeyHandler | KeyStore): handler is KeyHandler =>
  (handler as KeyStore).id === undefined;

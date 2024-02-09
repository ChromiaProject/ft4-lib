import {
  Authenticator,
  KeyHandler,
  KeyStore,
  createNoopAuthenticator,
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
} from "postchain-client";
import {
  getNonceIdForTxContext,
  getTransactionRid,
  BufferId,
} from "@ft4/utils";
import { OperationNotExistError } from "../errors";
import { TxContext, TxBuilderTransaction } from "../types";
import {
  AnchoringTimeoutError,
  AuthorizationError,
  OnAnchoredHandler,
  OperationContext,
  TransactionBuilder,
  TransactionBuilderConfig,
} from "./types";

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

  async function buildUnsigned(): Promise<TxBuilderTransaction> {
    if (_operations.find((op: OperationContext) => !!op.onAnchoredHandler))
      throw new Error(
        "Cannot build transaction with onAnchoredHandlers, use buildAndSend() instead",
      );

    return await _buildUnsigned();
  }

  async function _buildUnsigned(): Promise<TxBuilderTransaction> {
    const [operations, keyHandlers] = await authenticateOperations(
      _operations,
      _context,
    );

    keyHandlers.forEach((kh) => _keysUsed.push(kh));

    const txn: TxBuilderTransaction = {
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
        "Cannot build transaction with onAnchoredHandlers, use buildAndSend() instead",
      );

    return await _build();
  }

  function addSigners(...signers: FtKeyStore[]): TransactionBuilder {
    signers.forEach((signer) => _keysUsed.push(signer));
    return me;
  }

  async function buildAndSend(): Promise<{
    tx: SignedTransaction;
    receipt: TransactionReceipt;
  }> {
    const tx = await _build();
    const receipt = await client.sendTransaction(tx);

    const operationsWithHandlers = _operations.filter(
      (op: OperationContext) => !!op.onAnchoredHandler,
    );

    if (operationsWithHandlers.length) {
      new Promise((resolve) =>
        resolve(waitUntilAnchored(operationsWithHandlers, tx)),
      );
    }

    return {
      tx,
      receipt,
    };
  }

  async function _build(): Promise<Buffer> {
    const tx: TxBuilderTransaction = await _buildUnsigned();
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

  async function waitUntilAnchored(operations: OperationContext[], tx: Buffer) {
    const directoryClient = await createClient({
      nodeUrlPool: client.config.endpointPool.slice().map((ep) => ep.url),
      blockchainIid: 0,
    });
    const anchoringClient = await getAnchoringClient(
      directoryClient,
      client.config.blockchainRid,
    );
    const rawTx = gtv.decode(tx) as RawGtx;
    const txRid = getTransactionRid(rawTx);

    for (let i = 0; i < config.retryCount; ++i) {
      await new Promise((resolve) => setTimeout(resolve, config.waitTimeMs));

      let isAnchored = false;
      try {
        isAnchored = await isBlockAnchored(client, anchoringClient, txRid);
      } catch (error) {
        // TODO: Uncomment to pollute logs with errors
        // console.error("Error while checking block anchoring status", error);

        if (
          error instanceof BlockAnchoringException ||
          error instanceof SystemChainException
        ) {
          isAnchored = false;
        } else {
          throw error;
        }
      }

      if (isAnchored) {
        const proofCache = new Map<string, Operation>();
        const createProof = async (
          blockchainRid: BufferId,
        ): Promise<Operation> => {
          if (proofCache.has(blockchainRid.toString("hex"))) {
            return proofCache.get(blockchainRid.toString("hex"))!;
          }

          const proof = await createIccfProofTx(
            directoryClient,
            txRid,
            tx,
            rawTx[0][2], // signers
            client.config.blockchainRid,
            blockchainRid.toString("hex"),
            undefined,
            true,
          );

          const proofOp = proof.iccfTx.operations[0];

          return proofOp;
        };

        operations.forEach((op: OperationContext, idx: number) => {
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
        return;
      }
    }

    operations.forEach((op) => {
      if (!op.onAnchoredHandler) return;
      op.onAnchoredHandler(
        null,
        new AnchoringTimeoutError(
          "Block was not anchored within the specified timeout",
        ),
      );
    });
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
    session: client,
  });

  return me;
}

const isKeyHandler = (handler: KeyHandler | KeyStore): handler is KeyHandler =>
  (handler as KeyStore).id === undefined;

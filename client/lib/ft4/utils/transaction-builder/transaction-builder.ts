import {
  Authenticator,
  KeyHandler,
  KeyStore,
  createNoopAuthenticator,
} from "/ft4/authentication";
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
} from "postchain-client";
import { TxContext, TxBuilderTransaction, BufferId } from "../types";
import { OperationNotExistError } from "../errors";
import {
  AnchoringTimeoutError,
  AuthorizationError,
  OnAnchoredHandler,
  OperationContext,
  TransactionBuilder,
  TransactionBuilderConfig,
} from "./types";
import { getTransactionRid } from "..";
import { txToBuffer } from ".";

const defaultConfig: TransactionBuilderConfig = {
  retryCount: 10,
  waitTimeMs: 500,
};

/**
 * Creates a new TransactionBuilder instance
 * @param user object that holds authentication information for the transaction
 * @param client object that holds connection info for the transaction
 * @returns a TransactionBuilder instance
 */
export function transactionBuilder(
  authenticator: Authenticator,
  client: IClient,
  config: TransactionBuilderConfig = defaultConfig,
): TransactionBuilder {
  const _operations: OperationContext[] = [];
  const _keyhandlersUsed: KeyHandler[] = [];
  const _context: TxContext = {};
  let _noopAuthenticator: Authenticator;

  function add(
    operation: Operation,
    handler?: OnAnchoredHandler | undefined,
  ): TransactionBuilder {
    _operations.push({ operation, authenticator, onAnchoredHandler: handler });
    return me;
  }

  function toPubkeys(keyHandlers: (KeyHandler | KeyStore)[]): Buffer[] {
    return keyHandlers
      .map((handler) =>
        isKeyHandler(handler) ? handler.getSigners() : handler.id,
      )
      .filter((pubKey): pubKey is Buffer[] => !!pubKey)
      .flat();
  }

  async function buildUnsigned(): Promise<TxBuilderTransaction> {
    const [operations, keyHandlers] = await authenticateOperations(
      _operations,
      _context,
    );

    keyHandlers.forEach((kh) => _keyhandlersUsed.push(kh));

    const txn: TxBuilderTransaction = {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: [],
      signers: toPubkeys(_keyhandlersUsed),
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

      const keyHandler =
        await authenticator.getKeyHandlerForOperation(operation);

      if (!keyHandler) {
        throw new AuthorizationError(
          `No keyhandler registered to handle operation <${operation.name}>`,
        );
      }
      keyHandlers.push(keyHandler);
      const ops = await keyHandler.authorize(
        authenticator.accountId,
        operation,
        ctx,
        authenticator.authDataService,
      );
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

  async function build(): Promise<SignedTransaction> {
    const getKeyHandlersForSigners = (
      keyhandlersUsed: (KeyHandler | KeyStore)[],
      signers: Buffer[],
    ) => {
      const keyHandlers = keyhandlersUsed.reduce(
        (acc, curr: KeyHandler | KeyStore) => {
          if (isKeyHandler(curr)) {
            return { [curr.keyStore.id.toString()]: curr, ...acc };
          }
          return { [curr.id.toString()]: curr, ...acc };
        },
        {},
      );
      return signers.map((pk) => keyHandlers[pk.toString()]);
    };

    const tx: TxBuilderTransaction = await buildUnsigned();
    const keyHandlers = getKeyHandlersForSigners(_keyhandlersUsed, tx.signers);
    tx.signatures = await Promise.all(
      keyHandlers.map((kh) => {
        return kh.sign(txToBuffer(tx));
      }),
    );
    return gtx.serialize(tx);
  }

  function addSigners(...keyStores: KeyStore[]): TransactionBuilder {
    keyStores.forEach((keyStore) => _keyhandlersUsed.push(keyStore));
    return me;
  }

  async function buildWithSigners(
    ...keyStores: KeyStore[]
  ): Promise<SignedTransaction> {
    const tx = await buildUnsigned();
    tx.signers = [
      ...new Set(keyStores.map((keyStore) => keyStore.getSigners()).flat()),
    ];
    tx.signatures = await Promise.all(
      keyStores.map((keyStore) => keyStore.sign(txToBuffer(tx))),
    );
    return gtx.serialize(tx);
  }

  async function buildAndSend(): Promise<{
    tx: SignedTransaction;
    receipt: TransactionReceipt;
  }> {
    const tx = await me.build();
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

  async function waitUntilAnchored(operations: OperationContext[], tx: Buffer) {
    const directoryClient = await createClient({
      nodeUrlPool: client.config.endpointPool.slice(),
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

        if (error instanceof BlockAnchoringException) {
          isAnchored = false;
        } else {
          throw error;
        }
      }

      if (isAnchored) {
        const proofCache = new Map<string, Operation>();
        const createProof = async (brid: BufferId): Promise<Operation> => {
          if (proofCache.has(brid.toString("hex"))) {
            return proofCache.get(brid.toString("hex"))!;
          }

          const proof = await createIccfProofTx(
            directoryClient,
            txRid,
            tx,
            rawTx[0][2], // signers
            client.config.blockchainRid,
            brid.toString("hex"),
          );

          const iccfProofOperation = proof.iccfTx.operations[0];
          proofCache.set(brid.toString("hex"), iccfProofOperation);
          return iccfProofOperation;
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
    handler?: OnAnchoredHandler | undefined,
  ): TransactionBuilder {
    _operations.push({ operation, authenticator, onAnchoredHandler: handler });
    return me;
  }

  function addWithoutAuthenticator(
    operation: Operation,
    handler?: OnAnchoredHandler | undefined,
  ): TransactionBuilder {
    if (_noopAuthenticator === undefined) {
      _noopAuthenticator = createNoopAuthenticator(
        authenticator.authDataService,
      );
    }
    _operations.push({
      operation,
      authenticator: _noopAuthenticator,
      onAnchoredHandler: handler,
    });
    return me;
  }

  function keyHandlersUsed(): KeyHandler[] {
    return _keyhandlersUsed;
  }

  const me = Object.freeze({
    add,
    build,
    buildUnsigned,
    addSigners,
    addWithAuthenticator,
    addWithoutAuthenticator,
    buildWithSigners,
    buildAndSend,
    keyHandlersUsed,
    session: client,
  });

  return me;
}

const isKeyHandler = (handler: KeyHandler | KeyStore): handler is KeyHandler =>
  (handler as KeyStore).id === undefined;

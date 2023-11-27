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
  function add(
    operation: Operation,
    onAnchoredHandler?: OnAnchoredHandler,
  ): TransactionBuilder {
    this._operations.push({ operation, authenticator, onAnchoredHandler });
    return this;
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
      this._operations,
      this._context,
    );

    keyHandlers.forEach((kh) => this._keyhandlersUsed.push(kh));

    const txn: TxBuilderTransaction = {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: [],
      signers: toPubkeys(this._keyhandlersUsed),
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

  async function build(): Promise<Buffer> {
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

    const tx: TxBuilderTransaction = await this.buildUnsigned();
    const keyHandlers = getKeyHandlersForSigners(
      this._keyhandlersUsed,
      tx.signers,
    );
    tx.signatures = await Promise.all(
      keyHandlers.map((kh) => {
        return kh.sign(txToBuffer(tx));
      }),
    );
    return gtx.serialize(tx);
  }

  function addSigners(
    ...signers: (KeyStore | KeyHandler)[]
  ): TransactionBuilder {
    signers.forEach((signer) => this._keyhandlersUsed.push(signer));
    return this;
  }

  async function buildWithSigners(...signers: KeyHandler[]) {
    const tx = await this.buildUnsigned();
    tx.signers = [
      ...new Set(signers.map((signer) => signer.getSigners()).flat()),
    ];
    tx.signatures = await Promise.all(
      signers.map((handler: KeyHandler) => handler.sign(txToBuffer(tx))),
    );
    return gtx.serialize(tx);
  }

  async function buildAndSend(): Promise<{
    tx: SignedTransaction;
    receipt: TransactionReceipt;
  }> {
    const tx = await (this as TransactionBuilder).build();
    const receipt = await client.sendTransaction(tx);

    const operationsWithHandlers = this._operations.filter(
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
    const systemClient = await createClient({
      nodeUrlPool: client.config.endpointPool.slice(),
      blockchainIid: 0,
    });
    const anchoringClient = await getAnchoringClient(
      systemClient,
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
            systemClient,
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
    handler?: OnAnchoredHandler,
  ): TransactionBuilder {
    this._operations.push({ operation, authenticator, handler });
    return this;
  }

  function addWithoutAuthenticator(
    operation: Operation,
    handler?: OnAnchoredHandler,
  ): TransactionBuilder {
    if (this._noopAuthenticator === undefined) {
      this._noopAuthenticator = createNoopAuthenticator(
        authenticator.authDataService,
      );
    }
    this._operations.push({
      operation,
      authenticator: this._noopAuthenticator,
      handler,
    });
    return this;
  }

  const context: Partial<TransactionBuilder> = {
    _operations: [],
    _keyhandlersUsed: [],
    session: client,
    _context: {},
  };
  context.add = add.bind(context);
  context.build = build.bind(context);
  context.buildUnsigned = buildUnsigned.bind(context);
  context.addSigners = addSigners.bind(context);
  context.addWithAuthenticator = addWithAuthenticator.bind(context);
  context.addWithoutAuthenticator = addWithoutAuthenticator.bind(context);
  context.buildWithSigners = buildWithSigners.bind(context);
  context.buildAndSend = buildAndSend.bind(context);

  return context as TransactionBuilder;
}

const isKeyHandler = (handler: KeyHandler | KeyStore): handler is KeyHandler =>
  (handler as KeyStore).id === undefined;

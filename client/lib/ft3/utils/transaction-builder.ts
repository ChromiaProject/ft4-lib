import {
  GtxClient,
  Itransaction,
} from "postchain-client/built/src/gtx/interfaces";
import { Operation } from "./types";
import { Authenticator, KeyHandler } from "../authentication/interfaces";
import { RawGtv } from "postchain-client/built/src/gtv/types";

export type TransactionBuilder = {
  _operations: [Operation, Authenticator][];
  _keyhandlersUsed: KeyHandler[];
  /**
   * Adds an operation to include in the final transaction
   * @param operation the operation to add to the transaction
   * @returns an instance of the transaction builder object
   */
  add: (operation: Operation) => TransactionBuilder;
  /**
   * Adds an operation to include in the final transaction
   * the operation will be authenticated using the provided
   * authenticator, and if `build` is called, the authenticator
   * will also be used to sign the transaction.
   * @param operation the operation to add
   * @param authenticator the authenticator to use for this and only this operation
   * @returns an instance of the transaction builder object
   */
  addWithAuthenticator: (
    operation: Operation,
    authenticator: Authenticator
  ) => TransactionBuilder;
  /**
   * Add key handlers that will also be included as signers to this operation
   * if `build` is called, the key handlers will also sign the transaction
   * @param keyHandlers the key handlers to use for signing
   * @returns an instance of the transaction builder object
   */
  addSigners: (...keyHandlers: KeyHandler[]) => TransactionBuilder;
  /**
   * Builds a transaction the same way as `buildUnsigned` and also signs it
   * using the same key handlers that were used to authorize the operations,
   * as well as any explicitly added key handlers.
   * @param signers array of participants that should sign this transaction
   * @returns A promised containing the unsigned transaction
   */
  build: () => Promise<Itransaction>;
  /**
   * Builds an unsigned transaction containgin the previously added
   * transactions, as well as any authhorization operations as needed.
   * @param signers array of participants that should sign this transaction
   * @returns A promise containing the signed transaction
   */
  buildUnsigned: () => Promise<Itransaction>;
  session: GtxClient;
};

/**
 * Creates a new TransactionBuilder instance
 * @param user object that holds authentication information for the transaction
 * @param client object that holds connection info for the transaction
 * @returns a TransactionBuilder instance
 */
export function transactionBuilder(
  authenticator: Authenticator,
  client: GtxClient
): TransactionBuilder {
  function add(operation: Operation): TransactionBuilder {
    this._operations.push([operation, authenticator]);
    return this;
  }

  function toPubkeys(keyHandlers: KeyHandler[]): Buffer[] {
    return keyHandlers
      .map((handler) => handler.getSigners())
      .filter((pubKey) => pubKey)
      .flat();
  }

  async function buildUnsigned() {
    const operations = await authenticateOperations(
      this._operations,
      this._keyhandlersUsed
    );
    const txn = client.newTransaction(toPubkeys(this._keyhandlersUsed));
    operations
      .flat()
      .forEach(([name, ...args]: [string, RawGtv[]]) =>
        txn.addOperation(name, ...args)
      );
    return txn;
  }

  async function authenticateOperations(
    operations: [Operation, Authenticator][],
    keyHandlersUsed: KeyHandler[]
  ): Promise<Operation[][]> {
    const processedOperations: Operation[][] = [];
    const nonces = new Map<Buffer, number>();
    for (const tuple of operations) {
      const [operation, authenticator] = tuple;
      if (operation[0] === "nop") processedOperations.push([operation]);

      const keyHandler = await authenticator.getKeyHandlerForOperation(
        operation
      );
      if (!keyHandler) {
        throw new Error("No keyhandler registered to handle this operation");
      }
      keyHandlersUsed.push(keyHandler);
      if (!nonces.has(keyHandler.authDescriptor.id)) {
        nonces.set(
          keyHandler.authDescriptor.id,
          await authenticator.getNonce(keyHandler.authDescriptor.id)
        );
      }
      const nonce = nonces.get(keyHandler.authDescriptor.id);
      // FIXME `getKeyHandlerForOperation` already calls `getAuthRequirements`
      // See if we can avoid making two calls? Perhaps it will not be a problem when we start to cache data
      const authData = await authenticator.getAuthRequirements(operation);
      const message = authData.message.replace("{nonce}", `${nonce}`);
      const ops = await keyHandler.authenticate(
        authenticator.accountId,
        operation,
        {
          flags: authData.flags,
          message,
        }
      );
      // keep track of nonce in corresponding key handler?
      ops.forEach((op) => {
        if (op[0] === "ft.evm_auth") {
          nonces.set(keyHandler.authDescriptor.id, nonce + 1);
        }
      });
      processedOperations.push(ops);
    }
    return processedOperations;
  }

  async function build() {
    const tx = await this.buildUnsigned();
    await Promise.all(
      this._keyhandlersUsed.map((handler: KeyHandler) => handler.sign(tx))
    );
    return tx;
  }

  function addSigners(...signers: KeyHandler[]): TransactionBuilder {
    signers.forEach((signer) => this._keyhandlersUsed.push(signer));
    return this;
  }

  function addWithAuthenticator(
    operation: Operation,
    authenticator: Authenticator
  ): TransactionBuilder {
    this._operations.push([operation, authenticator]);
    return this;
  }

  const context: Partial<TransactionBuilder> = {
    _operations: [],
    _keyhandlersUsed: [],
    session: client,
  };
  context.add = add.bind(context);
  context.build = build.bind(context);
  context.buildUnsigned = buildUnsigned.bind(context);
  context.addSigners = addSigners.bind(context);
  context.addWithAuthenticator = addWithAuthenticator.bind(context);

  return context as TransactionBuilder;
}

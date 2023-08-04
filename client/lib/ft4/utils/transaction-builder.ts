import { Authenticator, KeyHandler } from "../authentication/types";
import { Buffer } from "buffer";
import { Operation, SignedTransaction, gtx, IClient } from "postchain-client";
import { TxBuilderTransaction } from "./types";
import { OperationNotExistError } from "./errors";

type OpAuthPair = [Operation, Authenticator];

export class AuthorizationError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "AuthorizationError";
  }
}

export type TransactionBuilder = {
  _operations: OpAuthPair[];
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
    authenticator: Authenticator,
  ) => TransactionBuilder;
  /**
   * Add key handlers that will also be included as signers to this operation.
   * If `build` is called, the key handlers will also sign the transaction
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
  build: () => Promise<SignedTransaction>;
  /**
   * Builds an unsigned transaction containing the previously added
   * transactions, as well as any authhorization operations as needed.
   * @param signers array of participants that should sign this transaction
   * @returns A promise containing the signed transaction
   */
  buildUnsigned: () => Promise<TxBuilderTransaction>;
  /**
   * A function to extract the keyhandlers used to build a transaction,
   * and thus should be the ones signing the transaction when
   * `buildUnsigned` was called instead of `build`.
   * @returns an array containing the keyhandlers used to build the transaction,
   * and which consequently should sign the transaction.
   */
  keyHandlersUsed: () => KeyHandler[];

  /**
   * Builds a transaction and signs it with the keyhandlers provided.
   * When using this function, the builder will completely ignore any
   * other keyhandlers previously provided.
   * @param keyHandlers the keyhandler to user
   * @returns a signed transaction
   */
  buildWithSigners: (
    ...keyHandlers: KeyHandler[]
  ) => Promise<SignedTransaction>;
  session: IClient;
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
  exposedOperations?: Set<string>,
): TransactionBuilder {
  function add(operation: Operation): TransactionBuilder {
    if (exposedOperations && !exposedOperations.has(operation.name)) {
      throw new OperationNotExistError(
        `Operation ${operation.name} does not exist`,
      );
    }
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
    const [operations, keyHandlers] = await authenticateOperations(
      this._operations,
    );
    keyHandlers.forEach((kh) => this._keyhandlersUsed.push(kh));
    const txn: TxBuilderTransaction = {
      blockchainRID: Buffer.from(client.config.blockchainRID, "hex"),
      operations: [],
      signers: toPubkeys(this._keyhandlersUsed),
      signatures: [],
    };
    const addOperation = (op: Operation) => {
      txn.operations.push({ opName: op.name, args: op.args });
    };
    operations.forEach((op: Operation | Operation[]) => {
      Array.isArray(op) ? op.forEach(addOperation) : addOperation(op);
    });
    return txn;
  }

  async function authenticateOperations(
    operations: OpAuthPair[],
  ): Promise<[Operation[], KeyHandler[]]> {
    const keyHandlers: KeyHandler[] = [];
    const nonces = new Map<Buffer, number>();
    const processedOperations: Operation[][] = [];
    for (const tuple of operations) {
      const [operation, authenticator] = tuple;
      if (operation.name === "nop") {
        processedOperations.push([operation]);
        continue;
      }

      const keyHandler = await authenticator.getKeyHandlerForOperation(
        operation,
      );

      if (!keyHandler) {
        throw new AuthorizationError(
          `No keyhandler registered to handle operation <${operation.name}>`,
        );
      }
      keyHandlers.push(keyHandler);
      if (!nonces.has(keyHandler.authDescriptor.id)) {
        nonces.set(
          keyHandler.authDescriptor.id,
          (await authenticator.getNonce(keyHandler.authDescriptor.id))!,
        );
      }

      const nonce = nonces.get(keyHandler.authDescriptor.id);
      const ops = await keyHandler.authorize(
        authenticator.accountId,
        operation,
        nonce,
        authenticator.authDataService,
      );
      // consider keeping nonce value in corresponding key handler
      ops.forEach((op) => {
        if (op.name === "ft4.evm_auth") {
          nonces.set(keyHandler.authDescriptor.id, nonce + 1);
        }
      });
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

  async function build() {
    const tx = await this.buildUnsigned();
    await Promise.all(
      this._keyhandlersUsed.map((handler: KeyHandler) => handler.sign(tx)),
    );
    return gtx.serialize(tx);
  }

  function addSigners(...signers: KeyHandler[]): TransactionBuilder {
    signers.forEach((signer) => this._keyhandlersUsed.push(signer));
    return this;
  }

  async function buildWithSigners(...signers: KeyHandler[]) {
    const tx = await this.buildUnsigned();
    tx.signers = [
      ...new Set(signers.map((signer) => signer.getSigners()).flat()),
    ];
    await Promise.all(signers.map((handler: KeyHandler) => handler.sign(tx)));
    return gtx.serialize(tx);
  }

  function addWithAuthenticator(
    operation: Operation,
    authenticator: Authenticator,
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
  context.buildWithSigners = buildWithSigners.bind(context);

  return context as TransactionBuilder;
}

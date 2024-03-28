import { Authenticator, FtKeyStore } from "@ft4/authentication";
import {
  IClient,
  Operation,
  RawGtx,
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
} from "postchain-client";
import { BufferId, RequireTogether } from "@ft4/utils";

export type TransactionBuilder = {
  /**
   * Adds an operation to include in the final transaction
   * @param operation the operation to add to the transaction
   * @param handler called when the transaction is anchored
   * @returns an instance of the transaction builder object
   */
  add: (
    operation: Operation,
    handler?: OnAnchoredHandler,
  ) => TransactionBuilder;
  /**
   * Adds an operation to include in the final transaction.
   * The operation will be authenticated using the provided
   * authenticator, and if `build` is called, the authenticator
   * will also be used to sign the transaction.
   * @param operation the operation to add
   * @param authenticator the authenticator to use for this and only this operation
   * @param handler called when the transaction is anchored
   * @returns an instance of the transaction builder object
   */
  addWithAuthenticator: (
    operation: Operation,
    authenticator: Authenticator,
    handler?: OnAnchoredHandler,
  ) => TransactionBuilder;
  /**
   * Adds an operation to include in the final transaction.
   * The operation will not be authenticated using FT4 authentication.
   * @param operation the operation to add
   * @param handler called when the transaction is anchored
   * @returns an instance of the transaction builder object
   */
  addWithoutAuthenticator: (
    operation: Operation,
    handler?: OnAnchoredHandler,
  ) => TransactionBuilder;

  /**
   * Adds an operation to include in the final transaction,
   * and wait for it to be ready to be proven in another chain.
   * @param operation the operation to add to the transaction
   * @param targetBlockchainRid the chain where the operation should be proven
   * @param handler called when the transaction is anchored and ready to be proven in the target chain
   * @returns an instance of the transaction builder object
   */
  addWithAnchoring: (
    operation: Operation,
    targetBlockchainRid: BufferId,
    handler: OnAnchoredHandler,
  ) => TransactionBuilder;

  /**
   * Adds an operation to include in the final transaction,
   * and wait for it to be ready to be proven in another chain.
   * The operation will be authenticated using the provided
   * authenticator, and it will also be used to sign the transaction.
   * @param operation the operation to add to the transaction
   * @param authenticator the authenticator to use for this and only this operation
   * @param targetBlockchainRid the chain where the operation should be proven
   * @param handler called when the transaction is anchored and ready to be proven in the target chain
   * @returns an instance of the transaction builder object
   */
  addWithAnchoringWithAuthenticator: (
    operation: Operation,
    authenticator: Authenticator,
    targetBlockchainRid: BufferId,
    handler: OnAnchoredHandler,
  ) => TransactionBuilder;

  /**
   * Adds an operation to include in the final transaction,
   * and wait for it to be ready to be proven in another chain.
   * The operation will not be authenticated using FT4 authentication.
   * @param operation the operation to add to the transaction
   * @param targetBlockchainRid the chain where the operation should be proven
   * @param handler called when the transaction is anchored and ready to be proven in the target chain
   * @returns an instance of the transaction builder object
   */
  addWithAnchoringWithoutAuthenticator: (
    operation: Operation,
    targetBlockchainRid: BufferId,
    handler: OnAnchoredHandler,
  ) => TransactionBuilder;

  /**
   * Add key stores that will also be included as signers to this transaction.
   * If `build` is called, the key stores will also be used to sign the transaction
   * @param keyStores the key stores to use for signing
   * @returns an instance of the transaction builder object
   */
  addSigners: (...keyStores: FtKeyStore[]) => TransactionBuilder;
  /**
   * Builds a transaction containing the previously added transactions, as well
   * as any authorization operations as needed, and signs it using the same key
   * handlers that were used to authorize the operations, as well as any
   * explicitly added key handlers.
   *
   * @returns A promised containing the signed transaction
   */
  build: () => Promise<SignedTransaction>;

  /**
   * Build the transaction and submits it to the blockchain.
   *
   * Will emit events when the transaction is built, and when it is sent
   * (containing the transaction RID).
   *
   * Will return when transaction is included in a block (confirmed), or is rejected.
   *
   * @returns an object containing the signed transaction and its receipt
   */
  buildAndSend: () => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;

  /**
   * Build the transaction, submits it to the blockchain and wait until it
   * has been anchored in cluster and system anchoring chains.
   *
   * Will emit events when the transaction is built, when it is sent
   * (containing the transaction RID), and when it is included in a
   * block (confirmed).
   *
   * Will trigger any registered `OnAnchoredHandler`s before returning.
   *
   * @returns an object containing the signed transaction and its receipt
   */
  buildAndSendWithAnchoring: () => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
      confirmed: TransactionReceipt;
    }
  >;

  session: IClient;
};

export class AuthorizationError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AuthorizationError";
  }
}

export class AnchoringTimeoutError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AnchoringTimeoutError";
  }
}

export type TransactionBuilderConfig = RequireTogether<
  ConfigOptions,
  "retryCount" | "waitTimeMs"
>;

export type OnAnchoredHandler = ((
  data: OnAnchoredHandlerData,
  error: null,
) => void) &
  ((data: null, error: Error) => void);

export type OperationContext = {
  operation: Operation;
  authenticator: Authenticator;
  targetBlockchainRid?: Buffer;
  onAnchoredHandler: OnAnchoredHandler | undefined;
  opIndex?: number;
};

export type OnAnchoredHandlerData = {
  operation: Operation;
  opIndex: number;
  tx: RawGtx;
  createProof: (blockchainRid: BufferId) => Promise<Operation>;
};

type ConfigOptions = {
  retryCount?: number;
  waitTimeMs?: number;
};

export type TransactionWithReceipt = {
  tx: SignedTransaction;
  receipt: TransactionReceipt;
};

import {
  IClient,
  Operation,
  RawGtx,
  SignedTransaction,
  TransactionReceipt,
} from "postchain-client";
import { Authenticator, KeyHandler, KeyStore } from "/ft4/authentication";
import { RequireTogether, TxBuilderTransaction, BufferId } from "../types";

export type TransactionBuilder = {
  /**
   * Adds an operation to include in the final transaction
   * @param operation the operation to add to the transaction
   * @returns an instance of the transaction builder object
   */
  add: (
    operation: Operation,
    handler?: OnAnchoredHandler | undefined,
  ) => TransactionBuilder;
  /**
   * Adds an operation to include in the final transaction.
   * The operation will be authenticated using the provided
   * authenticator, and if `build` is called, the authenticator
   * will also be used to sign the transaction.
   * @param operation the operation to add
   * @param authenticator the authenticator to use for this and only this operation
   * @returns an instance of the transaction builder object
   */
  addWithAuthenticator: (
    operation: Operation,
    authenticator: Authenticator,
    handler?: OnAnchoredHandler | undefined,
  ) => TransactionBuilder;
  /**
   * Adds an operation to include in the final transaction.
   * The operation will not be authenticated using FT4 authentication.
   * @param operation the operation to add
   * @returns an instance of the transaction builder object
   */
  addWithoutAuthenticator: (
    operation: Operation,
    handler?: OnAnchoredHandler | undefined,
  ) => TransactionBuilder;
  /**
   * Add key stores that will also be included as signers to this transaction.
   * If `build` is called, the key stores will also be used to sign the transaction
   * @param keyStores the key stores to use for signing
   * @returns an instance of the transaction builder object
   */
  addSigners: (...keyStores: KeyStore[]) => TransactionBuilder;
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
   * Builds a transaction and signs it with the keystores provided.
   * When using this function, the builder will completely ignore any
   * other keystores previously provided.
   * @param keyStores the keystores to user
   * @returns a signed transaction
   */
  buildWithSigners: (...keyStores: KeyStore[]) => Promise<SignedTransaction>;

  /**
   * Build the transaction and submits it to the blockchain. Will return
   * when transaction is included in a block, or is rejected. Using this
   * function will also trigger any registered `OnAnchoredHandler`s.
   * @returns an object containing the signed transaction and its receipt
   */
  buildAndSend: () => Promise<{
    tx: SignedTransaction;
    receipt: TransactionReceipt;
  }>;

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
  onAnchoredHandler: OnAnchoredHandler | undefined;
};

export type OnAnchoredHandlerData = {
  operation: Operation;
  opIndex: number;
  tx: RawGtx;
  createProof: (brid: BufferId) => Promise<Operation>;
};

type ConfigOptions = {
  retryCount?: number;
  waitTimeMs?: number;
};

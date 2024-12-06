import { Authenticator, FtKeyStore, Signer } from "@ft4/authentication";
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
   * @param operation - the operation to add to the transaction
   * @param config - a configuration object that will be used for this operation when building the transaction
   * @returns an instance of the transaction builder object
   */
  add: (operation: Operation, config?: OperationConfig) => TransactionBuilder;

  /**
   * Add key stores that will also be included as signers to this transaction.
   * If `build` is called, the key stores will also be used to sign the transaction
   * @param keyStores - the key stores to use for signing
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
      sent: TransactionReceipt;
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
      sent: TransactionReceipt;
      confirmed: TransactionReceipt;
    }
  >;

  session: IClient;
};

/**
 * Thrown to indicate that there was an error when authorizing an operation.
 */
export class AuthorizationError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AuthorizationError";
  }
}

/**
 * Thrown when an operation was not anchored within the specified timeout period.
 */
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

/**
 * Callback function that can be passed to the transaction builder.
 * When passed, transaction builder will invoke it with `OnAnchoredHandlerData`
 * once the transaction has been anchored on the anchoring chain.
 */
export type OnAnchoredHandler = ((
  data: OnAnchoredHandlerData,
  error: null,
) => void) &
  ((data: null, error: Error) => void);

/**
 * Configuration options for an operation.
 */
export type OperationConfig = {
  /** An optional authenticator instance used for the operation. */
  authenticator?: Authenticator;
  /** Callback function to be called when the transaction is anchored. If provided, `targetBlockchainRid` must also be provided. */
  onAnchoredHandler?: OnAnchoredHandler;
  /** An optional array of FtKeyStore instances that will be used to sign this operation. */
  signers?: Signer[];
  /** Buffer representing the rid where this operation should be anchored. If provided, `onAnchoredHandler` must also be provided. */
  targetBlockchainRid?: Buffer;
  /** Determines wether operation should skip ft signing with the provided keys */
  skipFtSigning?: boolean;
};

export type OperationContext = {
  operation: Operation;
  authenticator: Authenticator;
  onAnchoredHandler?: OnAnchoredHandler;
  targetBlockchainRid?: Buffer;
  opIndex?: number;
  signers?: Signer[];
  skipFtSigning?: boolean;
};

export type OnAnchoredHandlerData = {
  operation: Operation;
  opIndex: number;
  tx: RawGtx;
  /**
   * Used to create a proof that this operation happened on this blockchain
   * @param blockchainRid - the rid of the blockchain on which the produced proof will be validated
   * @returns a proof that this operation happened on the blockchain.
   */
  createProof: (blockchainRid: BufferId) => Promise<Operation>;
};

export type ConfigOptions = {
  retryCount?: number;
  waitTimeMs?: number;
};

export type TransactionWithReceipt = {
  tx: SignedTransaction;
  receipt: TransactionReceipt;
};

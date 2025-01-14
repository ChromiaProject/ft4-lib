import { Authenticator, FtKeyStore, Signer } from "@ft4/authentication";
import {
  IClient,
  Operation,
  SignedTransaction,
  TransactionReceipt,
  BufferId,
  GTX,
} from "postchain-client";
import { Web3CustomPromiEvent } from "@ft4/utils/promiEvent";

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
  buildAndSend: () => Web3CustomPromiEvent<
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
  buildAndSendWithAnchoring: () => Web3CustomPromiEvent<
    AnchoringTransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
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
 * Configuration options for an operation.
 */
export type OperationConfig = {
  /** An optional authenticator instance used for the operation. */
  authenticator?: Authenticator;
  /** An optional array of FtKeyStore instances that will be used to sign this operation. */
  signers?: Signer[];
  /** Determines wether operation should skip ft signing with the provided keys */
  skipFtSigning?: boolean;
};

export type OperationContext = {
  operation: Operation;
  authenticator: Authenticator;
  opIndex?: number;
  signers?: Signer[];
  skipFtSigning?: boolean;
};

export type TransactionWithReceipt = {
  tx: GTX;
  receipt: TransactionReceipt;
};

export type AnchoringTransactionWithReceipt = TransactionWithReceipt & {
  /**
   * Used to create a proof that this operation happened on this blockchain
   * @param blockchainRid - the rid of the blockchain on which the produced proof will be validated
   * @returns a proof that this operation happened on the blockchain.
   */
  systemConfirmationProof: (blockchainRid: BufferId) => Promise<Operation>;
};

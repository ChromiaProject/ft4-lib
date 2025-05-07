import { Amount, Balance } from "@ft4/asset";
import { Authenticator, KeyStore } from "@ft4/authentication";
import { Connection, OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { PaginatedEntity, TransactionSessionCompletion } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  TransferHistoryEntry,
  TransferHistoryFilter,
} from "./transfer-history";
import {
  AnyAuthDescriptor,
  AuthDescriptorRegistration,
  SingleSig,
} from "@ft4/accounts";
import { PendingTransfer, TransferRef } from "@ft4/crosschain";
import {
  BufferId,
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
} from "postchain-client";
import { TransactionWithReceipt } from "@ft4/transaction-builder";

export type AccountFilter = Partial<{
  ids: Array<Buffer> | null;
  type: string | null;
} | null>;

export type AccountAuthDescriptorFilter = Partial<{
  ids: Array<Buffer> | null;
  account_id: Buffer | null;
} | null>;

export type MainAccountAuthDescriptorFilter = Partial<{
  account_ids: Array<Buffer> | null;
  account_auth_descriptor_id: Buffer | null;
} | null>;

export type AuthDescriptorSignerFilter = Partial<{
  ids: Array<Buffer> | null;
  auth_descriptor_id: Buffer | null;
} | null>;

export type RlStateFilter = Partial<{
  account_ids: Array<Buffer> | null;
} | null>;

export type AccountCreationTransferFilter = Partial<{
  rowids: Array<number> | null;
  transaction_tx_rid: Buffer | null;
  op_index: number | null;
  recipient_id: Buffer | null;
} | null>;

export type AccountLinkFilter = Partial<{
  account_ids: Array<Buffer> | null;
  secondary_id: Buffer | null;
  type: string | null;
} | null>;

export type SubscriptionFilter = Partial<{
  account_ids: Array<Buffer> | null;
} | null>;

export type RateLimit = {
  points: number;
  lastUpdate: Date;
  /**
   * Retrieves the number of points currently available on an account.
   * Or null if the dApp does not have rate limiting enabled.
   */
  getAvailablePoints: () => number | null;
};

export type RateLimitResponse = {
  points: number;
  lastUpdate: number;
};

export type AccountResponse = {
  id: Buffer;
  type: string;
};

export const ACCOUNT_TYPE_USER = "FT4_USER";

export type RateLimitStateResponse = {
  account_id: Buffer;
  account_type: string;
  points: number;
  lastUpdate: number;
  recovery_time: number;
};

export type AuthDescriptorSignerResponse = {
  id: Buffer;
  account_auth_descriptor_id: Buffer;
  account_id: Buffer;
  account_type: string;
  account_auth_descriptor_auth_type: string;
  account_auth_descriptor_args: string;
  account_auth_descriptor_rules: string;
  account_auth_descriptor_created: number;
  account_auth_descriptor_ctr: number;
};

export type AccountCreationTransferResponse = {
  transaction_tx_rid: Buffer;
  sender_blockchain_rid: Buffer;
  sender_id: Buffer;
  recipient_id: Buffer;
  asset_id: Buffer;
  asset_name: string;
  asset_symbol: string;
  asset_decimals: number;
  asset_issuing_blockchain_rid: Buffer;
  asset_icon_url: string;
  asset_type: string;
  asset_total_supply: bigint;
  asset_uniqueness_resolver: Buffer;
  amount: bigint;
  timestamp: number;
  state: string;
  final_tx_rid: Buffer;
  final_op_index: number;
};

export type AccountLinkResponse = {
  account: Buffer;
  account_type: string;
  secondary: Buffer;
  secondary_type: string;
  type: string;
};

export type SubscriptionResponse = {
  subscription_account_id: Buffer;
  subscription_account_type: string;
  subscription_asset_id: Buffer;
  subscription_asset_name: string;
  subscription_asset_symbol: string;
  subscription_asset_decimals: number;
  subscription_asset_issuing_blockchain_rid: Buffer;
  subscription_asset_icon_url: string;
  subscription_asset_type: string;
  subscription_asset_uniqueness_resolver: Buffer;
  period_millis: number;
  last_payment: number;
};

export type Subscription = {
  subscriptionAccountId: Buffer;
  subscriptionAccountType: string;
  subscriptionAssetId: Buffer;
  subscriptionAssetName: string;
  subscriptionAssetSymbol: string;
  subscriptionAssetDecimals: number;
  subscriptionAssetIssuingBlockchainRid: Buffer;
  subscriptionAsseticonUrl: string;
  subscriptionAssetType: string;
  subscriptionAssetuniquenessResolver: Buffer;
  periodMillis: number;
  lastPayment: number;
};

export type AccountCreationTransfer = {
  transactionTxRid: Buffer;
  senderBlockchainRid: Buffer;
  senderId: Buffer;
  recipientId: Buffer;
  assetId: Buffer;
  assetName: string;
  assetSymbol: string;
  assetDecimals: number;
  assetIssuingBlockchainRid: Buffer;
  assetIconUrl: string;
  assetType: string;
  assetTotalSupply: bigint;
  assetUniquenessResolver: Buffer;
  amount: bigint;
  timestamp: number;
  state: string;
  finalTxRid: Buffer;
  finalOpIndex: number;
};

export type RlState = {
  accountId: Buffer;
  accountType: string;
  points: number;
  lastUpdate: number;
  recoveryTime: number;
};

export type AuthDescriptorSigner = {
  id: Buffer;
  accountAuthDescriptorId: Buffer;
  accountId: Buffer;
  accountType: string;
  accountAuthDescriptorAuthType: string;
  accountAuthDescriptorArgs: string;
  accountAuthDescriptorRules: string;
  accountAuthDescriptorCreated: number;
  accountAuthDescriptorCtr: number;
};
/**
 * Represents a blockchain account which is read only.
 * That is, using this object you can get information about
 * an account, but you cannot submit authenticated operations with it.
 *
 * For an account to which it is possible to write, see {@link AuthenticatedAccount}
 */
export interface Account {
  id: Buffer;
  blockchainRid: Buffer;
  connection: Connection;
  /**
   * Retrieves all the balances of all assets that is available on the account and returns them as
   * a paginated entity.
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getBalances: (
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Balance>>;

  /**
   * Retrieves the balance for a specific asset
   * @param assetId - the id of the asset to fetch balance for
   * @returns the balance of the asset on this account, or `null` if this account does not have the asset
   */
  getBalanceByAssetId: (assetId: BufferId) => Promise<Balance | null>;

  /**
   * Determines whether the auth descriptor with the specified id is valid.
   * @param authDescriptorId - the id of the auth descriptor to check
   * @returns true or false depending on if the auth descriptor is valid or not
   */
  isAuthDescriptorValid: (authDescriptorId: BufferId) => Promise<boolean>;

  /**
   * Retrieves the main auth descriptor of this account
   */
  getMainAuthDescriptor: () => Promise<AnyAuthDescriptor>;

  /**
   * Retrieves all auth descriptors associated with this account
   */
  getAuthDescriptors: () => Promise<AnyAuthDescriptor[]>;

  /**
   * Fetches an auth descriptor by its ID.
   *
   * @remarks
   * the auth descriptor in question needs to be associated with this account and if no auth descriptor
   * is found, this method will throw an error
   *
   * @param authDescriptorId - the id of the auth descriptor to fetch
   *
   */
  getAuthDescriptorById: (
    authDescriptorId: BufferId,
  ) => Promise<AnyAuthDescriptor>;

  /**
   * Retrieves all auth descriptors on which the specified signer is also a signer.
   * @param signer - the signer whose auth descriptors to retrieve
   */
  getAuthDescriptorsBySigner: (
    signer: BufferId,
  ) => Promise<AnyAuthDescriptor[]>;

  /**
   * Retrieves the current rate limit for this account. I.e., how many points this account currently has.
   */
  getRateLimit: () => Promise<RateLimit>;

  /**
   * Retrieves the full transfer history for this account as a paginated entity.
   * @param limit - maximum page size
   * @param filter - a filter to determine what type of transfer history entries to fetch
   * @param cursor - where the page should start
   */
  getTransferHistory: (
    limit?: number,
    filter?: TransferHistoryFilter,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<TransferHistoryEntry>>;

  /**
   * Retrieves a specific `TransferHistoryEntry`
   * @param rowid - the rowid of the `TransferHistoryEntry`
   * @returns the requested transfer history entry, or `null` if that `rowid` does not exist.
   */
  getTransferHistoryEntry: (
    rowid: number,
  ) => Promise<TransferHistoryEntry | null>;

  /**
   * Retrieves all pending (i.e., started but not yet completed) cross chain transfers initiated by this account.
   *
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getPendingCrosschainTransfers: (
    limit?: OptionalLimit,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<PendingTransfer>>;
  /**
   * Retrieves the most recent pending transfer which matches the specified arguments
   * @param targetBlockchainRid - the rid of the blockchain that the transfer was targeting
   * @param recipientId - the id of the account that is going to receive the transfer
   * @param assetId - the id of the asset that is being transferred
   * @param amount - how much of the asset that is being transferred
   * @returns the latest pending transfer that matches the criteria. Or null if no such transfer is found
   */
  getLastPendingCrosschainTransfer: (
    targetBlockchainRid: BufferId,
    recipientId: BufferId,
    assetId: BufferId,
    amount: bigint,
  ) => Promise<PendingTransfer | null>;
}

/**
 * Represents a blockchain account to which the user
 * has at least one signing key that is valid for
 * performing operations. This means that an object of
 * this type can be used to get information about an
 * account and submit authenticated operations.
 *
 * For a "read-only" account without keys, see {@link Account}
 */
export interface AuthenticatedAccount extends Account {
  authenticator: Authenticator;
  /**
   * Adds a new auth descriptor to the account
   * @param authDescriptor - the auth descriptor information to use when registering the auth descriptor
   * @param keyStore - keystore that should match the pubkey in the first argument. Will be used to sign the transaction
   */
  addAuthDescriptor: (
    authDescriptor: AuthDescriptorRegistration<SingleSig>,
    keyStore: KeyStore,
  ) => Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  /**
   * Replaces the previous main auth descriptor with a new one which will be created with the provided information.
   *
   * @remarks
   * This function will throw an error if this `AuthenticatedAccount` instance does not have access to the private key of the
   * current main auth descriptor.
   *
   * @param authDescriptor - the auth descriptor information to use for the new auth descriptor
   * @param keyStore - keystore that should match the pubkey in the first argument. Will be used to sign the transaction
   */
  updateMainAuthDescriptor: (
    authDescriptor: AuthDescriptorRegistration<SingleSig>,
    keyStore: KeyStore,
  ) => Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  /**
   * Deletes the auth descriptor with the the specified id. The auth descriptor in question does not necessarily need
   * to be associated with this account, but the keys stored in this account will be used to sign the operation.
   * @param authDescriptorId - the id of the auth descriptor to delete
   */
  deleteAuthDescriptor: (authDescriptorId: BufferId) => Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  /**
   * Deletes all auth descriptors on this account, except for the main one which cannot be deleted.
   * Requires that the user has instantiated this structure with the keystore that holds the private key
   * for the main auth descriptor.
   */
  deleteAllAuthDescriptorsExceptMain: () => Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  /**
   * Transfers the specified amount of the specified asset from this account to the specified receiver.
   *
   * @param receiverId - who should receive the assets
   * @param assetId - what asset should be sent
   * @param amount - how much of that asset should be sent
   */
  transfer: (
    receiverId: BufferId,
    assetId: BufferId,
    amount: Amount,
  ) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;

  /**
   * Returns a transfer that was properly delivered to its destination, but not claimed in time, to this account.
   * @param txRid - the id of the transaction in which the transfer was made
   * @param opIndex - the index of the operation within the transaction
   */
  recallUnclaimedTransfer: (
    txRid: BufferId,
    opIndex: number,
  ) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;

  /**
   * Perform a cross-chain transfer.
   *
   * Will emit events when the `init_transfer` transaction is built,
   * when `init_transfer` transaction is anchored,
   * and on each hop (containing blockchain RID).
   *
   * Will resolve when `complete_transfer` transaction is confirmed.
   *
   * @param targetChainRid - RID of the target blockchain.
   * @param recipientId - ID of the recipient.
   * @param assetId - ID of the asset to be transferred.
   * @param amount - The amount to be transferred.
   * @param ttl - timeout of this transfer in milliseconds. If the transfer has not been
   * completed within this timeout, it can be reverted.
   * This argument is designed to be combined with one of the time functions, e.g., {@link authentication.days}.
   */
  crosschainTransfer: (
    targetChainRid: BufferId,
    recipientId: BufferId,
    assetId: BufferId,
    amount: Amount,
    ttl?: number,
  ) => Web3PromiEvent<
    TransferRef,
    {
      built: SignedTransaction;
      init: TransactionReceipt;
      hop: Buffer;
    }
  >;

  /**
   * Resume a cross-chain transfer which was initiated but did not complete properly.
   *
   * Will emit event on each hop (containing blockchain RID).
   *
   * Will resolve when `complete_transfer` transaction is confirmed.
   *
   * @param pendingTransfer - The transfer to resume
   *
   */
  resumeCrosschainTransfer: (pendingTransfer: TransferRef) => Web3PromiEvent<
    void,
    {
      hop: Buffer;
    }
  >;

  /**
   * Revert a cross-chain transfer which was initiated but did not complete properly.
   *
   * Will emit event on each hop (containing blockchain RID).
   *
   * Will resolve when `revert_transfer` transaction is confirmed.
   *
   * @param pendingTransfer - The transfer to revert
   *
   */
  revertCrosschainTransfer: (pendingTransfer: TransferRef) => Web3PromiEvent<
    void,
    {
      hop: Buffer;
    }
  >;

  /**
   * Recalls a cross-chain account creation transfer which was not claimed
   * before timeout.
   *
   * Will emit event on each hop (containing blockchain RID).
   *
   * Will resolve when `revert_transfer` transaction is confirmed.
   *
   * @param pendingTransfer - The transfer to recall
   *
   */
  recallUnclaimedCrosschainTransfer: (
    pendingTransfer: TransferRef,
  ) => Web3PromiEvent<
    void,
    {
      hop: Buffer;
    }
  >;

  /**
   * Burns the specified amount of the specified asset from this account
   * @param assetId - the id of the asset to burn
   * @param amount - how much of the asset to burn
   */
  burn: (
    assetId: BufferId,
    amount: Amount,
  ) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
}

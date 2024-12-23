import { BufferId, Config, PaginatedEntity } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  TransactionBuilder,
  TransactionBuilderConfig,
} from "@ft4/transaction-builder";
import {
  GTX,
  IClient,
  Operation,
  Queryable,
  RawGtx,
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
} from "postchain-client";
import {
  Account,
  AuthDescriptorValidator,
  AuthenticatedAccount,
  TransferDetail,
} from "@ft4/accounts";
import { Asset } from "@ft4/asset";
import { LoginOptions, SessionWithLogout } from "@ft4/authentication";
import { TransactionWithReceipt } from "@ft4/transaction-builder/types";
import {
  AppliedTransfer,
  AssetOrigin,
  AssetOriginFilter,
  PendingTransfer_,
  PendingTransferFilter,
  Transfer,
  TransferFilter,
} from "@ft4/crosschain/types";

export type PageCursor = string;
export type OptionalPageCursor = PageCursor | null;
export type OptionalLimit = number | null;
export type PagedResponse<T> = {
  data: T[];
  next_cursor: OptionalPageCursor;
};

/**
 * An object that allows the user to make ft aware queries to the blockchain.
 * The queries that can be made using this object are general queries that are
 * not specific to one account. However, a `Connection` instance can be used
 * to acquire an `Account` instance, from which account specific details can
 * be found. @see {@link Account}
 */
export interface Connection extends Queryable {
  client: IClient;
  blockchainRid: Buffer;

  /**
   * Returns the ft config that is currently in effect
   */
  getConfig: () => Promise<Config>;
  /**
   * Returns the version of ft library installed on the blockchain with the format <major>.<minor>.<patch>
   */
  getVersion: () => Promise<string>;
  /**
   * Returns the API version of ft library installed on the blockchain. It will be an integer.
   */
  getApiVersion: () => Promise<number>;

  /**
   * Returns the current block height of the underlying chain
   */
  getBlockHeight: () => Promise<number>;

  /**
   * Fetches the account with the specified id
   * @param accountId - the id of the account to fetch
   * @returns the account with the specified id, or null if no account with that id exists
   */
  getAccountById: (accountId: BufferId) => Promise<Account | null>;
  /**
   * Fetches all accounts with which the provided signer has at least one associated auth descriptor
   * @param signer - the pubkey of the signer
   * @param limit - maximum size of the returned page
   * @param cursor - at what entry the page should start
   */
  getAccountsBySigner: (
    signer: BufferId,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Account>>;
  /**
   * Fetches all accounts with which the auth descriptor with the specified id is associated
   * @param id - id of the auth descriptor
   * @param limit - maximum size of the returned page
   * @param cursor - at what entry the page should start
   */
  getAccountsByAuthDescriptorId: (
    id: BufferId,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Account>>;
  /**
   * Returns all accounts of the specified type that is registered on the blockchain as a paginated entity
   * @param type - the type of account to get
   * @param limit - maximum size of the returned page
   * @param cursor - at what entry the page should start
   */
  getAccountsByType: (
    type: string,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Account>>;
  /**
   * Gets a validator instance that can be used to validate if an auth descriptor is valid or not
   * @param useCache - whether the returned validator should cache validation results or make new backend request for each function call
   */
  getAuthDescriptorValidator: (useCache: boolean) => AuthDescriptorValidator;
  /**
   * Returns a list containing the name of all of the enabled strategies
   */
  getEnabledRegistrationStrategies: () => Promise<string[]>;
  /**
   * {@inheritDoc asset.getAssetById}
   * @param assetId - the id of the asset to fetch
   */
  getAssetById: (assetId: BufferId) => Promise<Asset | null>;
  /**
   * {@inheritDoc asset.getAssetsBySymbol}
   * @param symbol - the symbol of the asset to fetch
   * @param limit - maximum size of the returned page
   * @param cursor - at what entry the page should start
   */
  getAssetsBySymbol: (
    symbol: string,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Asset>>;
  /**
   * {@inheritDoc asset.getAssetsByName}
   * @param name - the name of the asset to fetch
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getAssetsByName: (
    name: string,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Asset>>;
  /**
   * {@inheritDoc asset.getAssetsByType}
   * @param type - the type of assets to return
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getAssetsByType: (
    type: string,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Asset>>;
  /**
   * {@inheritDoc asset.getAllAssets}
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getAllAssets: (
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Asset>>;
  /**
   * {@inheritDoc accounts.getTransferDetails}
   * @param txRid - the id of the transaction in which the transfer was made
   * @param opIndex - the index of the transfer operation within the transaction
   */
  getTransferDetails: (
    txRid: BufferId,
    opIndex: number,
  ) => Promise<TransferDetail[]>;
  /**
   * {@inheritDoc accounts.getTransferDetailsByAsset}
   * @param txRid - the id of the transaction in which the transfer was made
   * @param opIndex - the index of the transfer operation within the transaction
   * @param assetId - the asset id for which to return details
   */
  getTransferDetailsByAsset: (
    txRid: BufferId,
    opIndex: number,
    assetId: BufferId,
  ) => Promise<TransferDetail[]>;
  /**
   * {@inheritDoc crosschain.getAssetOriginFiltered}
   * @param assetOriginFilter - The asset origin filter (array of assetId) that can be applied to the query results
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getAssetOriginFiltered: (
    assetOriginFilter?: AssetOriginFilter | null,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<AssetOrigin>>;
  /**
   * {@inheritDoc crosschain.getAppliedTransfersFiltered}
   * @param appliedTransferFilter - The applied transfer filter (array of initTxRid and initOpIndex)
   * that can be applied to the query results
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getAppliedTransfersFiltered: (
    appliedTransferFilter?: TransferFilter | null,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<AppliedTransfer>>;
  /**
   * {@inheritDoc crosschain.getCanceledTransfersFiltered}
   * @param canceledTransferFilter - The canceled transfer filter (array of initTxRid and initOpIndex)
   * that can be applied to the query results
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getCanceledTransfersFiltered: (
    canceledTransferFilter?: TransferFilter | null,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Transfer>>;
  /**
   * {@inheritDoc crosschain.getUnappliedTransfersFiltered}
   * @param unappliedTransferFilter - The unapplied transfer filter (array of initTxRid and initOpIndex)
   * that can be applied to the query results
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getUnappliedTransfersFiltered: (
    unappliedTransferFilter?: TransferFilter | null,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Transfer>>;
  /**
   * {@inheritDoc crosschain.getRecalledTransfersFiltered}
   * @param recalledTransferFilter - The recalled transfer filter (array of initTxRid and initOpIndex)
   * that can be applied to the query results
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getRecalledTransfersFiltered: (
    recalledTransferFilter?: TransferFilter | null,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Transfer>>;
  /**
   * {@inheritDoc crosschain.getPendingTransfersFiltered}
   * @param pendingTransferFilter - The pending transfer filter (array of transactionId, initOpIndex and senderAccountId)
   * that can be applied to the query results
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getPendingTransfersFiltered: (
    pendingTransferFilter?: PendingTransferFilter | null,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<PendingTransfer_>>;
  /**
   * {@inheritDoc crosschain.getRevertedTransfersFiltered}
   * @param pendingTransferFilter - The pending transfer filter (array of initTxRid and initOpIndex)
   * that can be applied to the query results
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getRevertedTransfersFiltered: (
    revertedTransferFilter?: TransferFilter | null,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Transfer>>;
}

/**
 * An object which allows the user to interact with an account
 * by both querying and submitting signed transactions.
 */
export interface Session extends Connection {
  account: AuthenticatedAccount;
  /**
   * Builds and sends a transaction containing the specified operations. This method will also
   * make sure to perform the appropriate authentication and signing of each operation, as well
   * as inserting a `nop` operation at the end to make each transaction unique. If you don't
   * want the tx to include a `nop` use {@link Session.callWithoutNop | callWithoutNop} instead.
   * @param operations - the operations to include in the transaction
   */
  call: (...operations: Operation[]) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  /**
   * Same as {@link Session.call | call} but it does not include a `nop` at the end. Meaning that
   * subsequent calls to this function with the same arguments is likely to be rejected.
   * @param operations - the operations to include in the transaction
   */
  callWithoutNop: (...operations: Operation[]) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  /**
   * Returns a `TransactionBuilder` instance configured to use the same keys as enclosed in this `Session` instance.
   * @param config - config to use when instantiating the transaction builder
   */
  transactionBuilder: (
    config?: TransactionBuilderConfig | undefined,
  ) => TransactionBuilder;
  /**
   * Signs a transaction using an available key
   * @param tx - the transaction to sign
   * @returns the original transaction with the appropriate signatures added
   */
  sign: (tx: GTX | RawGtx | SignedTransaction) => Promise<SignedTransaction>;
  /**
   * Same as {@link Session.sign | sign} but it also submits the resulting transaction to the blockchain.
   * @param tx - the transaction to sign and send
   * @returns a receipt with the result of submitting the transaction
   */
  signAndSend: (
    tx: GTX | RawGtx | SignedTransaction,
  ) => Promise<TransactionReceipt>;
}

export type KeyStoreInteractor = {
  /**
   * Retrieves a list of Accounts associated with the signer. At most MAX_PAGE_SIZE.
   * To fetch more Accounts, use {@link getAccountsPaginated}
   */
  getAccounts(): Promise<Account[]>;
  /**
   * Retrieves a list of Accounts associated with the signer as a paginated entity.
   * @param limit - maximum page size
   * @param cursor - where the page should start
   */
  getAccountsPaginated(
    limit: number,
    cursor: OptionalPageCursor,
  ): Promise<PaginatedEntity<Account>>;
  /**
   * Creates a session object for the provided account id.
   * @param accountId - account id to create a session for
   */
  getSession(accountId: BufferId): Promise<Session>;
  /**
   * Uses the underlying keystore to sign into the specified account
   * @param loginOptions - the account to sign in to
   * @returns the authenticated temporary session
   */
  login: (loginOptions: LoginOptions) => Promise<SessionWithLogout>;
  /**
   * Register a callback that is invoked when the underlying keystore is changed.
   * This could e.g., happen if the user switches account in MetaMask.
   * @param callback - the callback function to invoke when keystore changes
   */
  onKeyStoreChanged(
    callback: (newKeyStore: KeyStoreInteractor | null) => void,
  ): void;
  /**
   * Allows checking whether calling login will result in an authentication request for the
   * user or an old login key and auth descriptor will be reused.
   *
   * If an active session is found, calling `login` will not prompt the user to login again.
   *
   * `rules` field will **NOT** be validated against, except checking whether the auth
   * descriptor has expired. This means that if the `loginOptions` ask for 5 minutes expiration,
   * an auth descriptor expiring in 2 seconds will be deemed valid and reused by `login`
   */
  hasActiveLogin(loginOptions: LoginOptions): Promise<boolean>;
};

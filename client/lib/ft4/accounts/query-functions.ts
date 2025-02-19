import { getBalanceByAccountId, getBalancesByAccountId } from "@ft4/asset";
import { Buffer } from "buffer";
import { formatter, Queryable } from "postchain-client";
import {
  PendingTransfer,
  PendingTransferResponse,
  getLastPendingTransferForAccount,
  mapPendingTransfers,
  pendingTransfersForAccount,
} from "@ft4/crosschain";
import { Connection, OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import {
  BufferId,
  PaginatedEntity,
  getConfig,
  retrievePaginatedEntity,
} from "@ft4/utils";
import * as Query from "./queries";
import {
  RateLimitQuery,
  accountAuthDescriptors,
  accountAuthDescriptorsBySigner,
  accountById,
  accountsByAuthDescriptorId,
  accountsBySigner,
  authDescriptorById,
  transferHistory,
  accountsFiltered,
  accountAuthDescriptorsFiltered,
  mainAuthDescriptorsFiltered,
  authDescriptorSignersFiltered,
  rlStatesFiltered,
  accountCreationTransfersFiltered,
  accountLinksFiltered,
  subscriptionsFiltered,
} from "./queries";
import {
  AnyAuthDescriptor,
  gtv,
  RawAnyAuthDescriptor,
} from "./auth-descriptor";
import {
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
  createTransferHistoryEntryFromResponse,
} from "./transfer-history";
import {
  Account,
  RateLimit,
  AccountFilter,
  AccountResponse,
  AccountAuthDescriptorFilter,
  MainAccountAuthDescriptorFilter,
  AuthDescriptorSignerFilter,
  RlStateFilter,
  RateLimitStateResponse,
  AccountCreationTransferFilter,
  AccountCreationTransferResponse,
  AccountLinkFilter,
  AccountLinkResponse,
  AccountCreationTransfer,
  AuthDescriptorSigner,
  RlState,
  SubscriptionFilter,
  SubscriptionResponse,
  Subscription,
  AuthDescriptorSignerResponse,
} from "./types";

//this will be outdated as soon as another tx is sent to the same account:
//does it make sense for the users to have it? Who needs this info?
export async function getRateLimit(
  queryable: Queryable,
  accountId: BufferId,
): Promise<RateLimit> {
  const rateLimitResponse = await queryable.query(RateLimitQuery(accountId));
  const rateLimit = {
    points: rateLimitResponse.points,
    lastUpdate: new Date(rateLimitResponse.lastUpdate),
  };

  const chainInfo = await getConfig(queryable);

  return Object.freeze({
    points: rateLimit.points,
    lastUpdate: rateLimit.lastUpdate,
    getAvailablePoints: () => {
      if (chainInfo.rateLimit.active) {
        const deltaTime = Date.now() - rateLimitResponse.lastUpdate;
        const points =
          rateLimit.points + deltaTime / chainInfo.rateLimit.recoveryTime;
        return Math.min(points, chainInfo.rateLimit.maxPoints);
      }
      return null;
    },
  });
}

/**
 * Creates an instance of the `Account` interface
 * @param connection - a connection to the blockchain where this account is registered
 * @param accountId - the id of the account
 */
export function createAccountObject(
  connection: Connection,
  accountId: BufferId,
): Account {
  return Object.freeze({
    connection,
    id: formatter.ensureBuffer(accountId),
    blockchainRid: formatter.toBuffer(connection.client.config.blockchainRid),
    getBalanceByAssetId: (assetId: BufferId) =>
      getBalanceByAccountId(connection, accountId, assetId),
    getBalances: (
      limit: OptionalLimit = null,
      cursor: OptionalPageCursor = null,
    ) => getBalancesByAccountId(connection, accountId, limit, cursor),
    isAuthDescriptorValid: (authDescriptorId: BufferId) =>
      isAuthDescriptorValid(connection, accountId, authDescriptorId),
    getAuthDescriptors: () => getAuthDescriptors(connection, accountId),
    getAuthDescriptorById: (authDescriptorId: BufferId) =>
      getAuthDescriptorById(connection, accountId, authDescriptorId),
    getMainAuthDescriptor: () =>
      getAccountMainAuthDescriptor(connection, accountId),
    getAuthDescriptorsBySigner: (signer: BufferId) =>
      getAuthDescriptorsBySigner(connection, accountId, signer),
    getRateLimit: () => getRateLimit(connection.client, accountId),
    getTransferHistory: async (
      limit: OptionalLimit = null,
      filter: TransferHistoryFilter = {},
      cursor: OptionalPageCursor = null,
    ) => {
      return retrievePaginatedEntity<
        TransferHistoryEntry,
        TransferHistoryEntryResponse
      >(
        connection,
        transferHistory(accountId, filter, limit, cursor),
        (entries) =>
          entries.map((entry) => createTransferHistoryEntryFromResponse(entry)),
      );
    },
    getTransferHistoryEntry: async (rowid: number) => {
      return createTransferHistoryEntryFromResponse(
        await connection.query("ft4.get_transfer_history_entry", { rowid }),
      );
    },
    getPendingCrosschainTransfers: async (
      limit: OptionalLimit = null,
      cursor: OptionalPageCursor = null,
    ) => {
      return retrievePaginatedEntity<PendingTransfer, PendingTransferResponse>(
        connection,
        pendingTransfersForAccount(accountId, limit, cursor),
        mapPendingTransfers,
      );
    },
    getLastPendingCrosschainTransfer: async (
      targetBlockchainRid: BufferId,
      recipientId: BufferId,
      assetId: BufferId,
      amount: bigint,
    ) => {
      return getLastPendingTransferForAccount(
        connection,
        accountId,
        targetBlockchainRid,
        recipientId,
        assetId,
        amount,
      );
    },
  });
}

/**
 * Retrieves a paginated list of accounts based on the provided filter, limit, and cursor.
 *
 * @param connection - The connection object to interact with the database.
 * @param filter - An optional filter to apply to the accounts query.
 * @param limit - An optional limit to the number of accounts to retrieve.
 * @param cursor - An optional cursor for pagination.
 * @returns A promise that resolves to a paginated entity containing the accounts.
 */
export async function getAccountsFiltered(
  connection: Connection,
  filter: AccountFilter = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Account>> {
  return retrievePaginatedEntity<Account, AccountResponse>(
    connection,
    accountsFiltered(filter, limit, cursor),
    (accounts) =>
      accounts.map((acc) => createAccountObject(connection, acc.id)),
  );
}

/**
 * Retrieves a paginated list of account authdescriptors based on the provided filter, limit, and cursor.
 *
 * @param connection - The connection object to interact with the backend service.
 * @param accountAuthDescriptorFilter - An optional filter to apply to the account auth descriptors.
 * @param limit - An optional limit on the number of results to return.
 * @param cursor - An optional cursor for pagination.
 * @returns A promise that resolves to a paginated entity containing the account auth descriptors.
 */
export async function getAccountAuthDescriptorsFiltered(
  connection: Connection,
  accountAuthDescriptorFilter: AccountAuthDescriptorFilter = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AnyAuthDescriptor>> {
  return retrievePaginatedEntity<AnyAuthDescriptor, RawAnyAuthDescriptor>(
    connection,
    accountAuthDescriptorsFiltered(accountAuthDescriptorFilter, limit, cursor),
    (accountAuthDescriptors) =>
      accountAuthDescriptors
        ? gtv.mapAuthDescriptorsFromGtv(accountAuthDescriptors)
        : [],
  );
}

/**
 * Retrieves a paginated list of main auth descriptors filtered by the provided criteria.
 *
 * @param connection - The connection object to interact with the backend service.
 * @param mainAccountAuthDescriptorFilter - An optional filter to apply to the main account auth descriptors.
 * @param limit - An optional limit on the number of results to return.
 * @param cursor - An optional cursor for pagination.
 * @returns A promise that resolves to a paginated entity containing the filtered auth descriptors.
 */
export async function getMainAuthDescriptorsFiltered(
  connection: Connection,
  mainAccountAuthDescriptorFilter: MainAccountAuthDescriptorFilter = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AnyAuthDescriptor>> {
  return retrievePaginatedEntity<AnyAuthDescriptor, RawAnyAuthDescriptor>(
    connection,
    mainAuthDescriptorsFiltered(mainAccountAuthDescriptorFilter, limit, cursor),
    (mainAuthDescriptors) =>
      mainAuthDescriptors
        ? gtv.mapAuthDescriptorsFromGtv(mainAuthDescriptors)
        : [],
  );
}

/**
 * Retrieves a paginated list of AuthDescriptorSigners based on the provided filter, limit, and cursor.
 *
 * @param connection - The connection object to interact with the backend service.
 * @param authDescriptorSignerFilter - An optional filter to apply to the AuthDescriptorSigners.
 * @param limit - An optional limit to the number of results returned.
 * @param cursor - An optional cursor for pagination.
 * @returns A promise that resolves to a PaginatedEntity containing AuthDescriptorSigners.
 */
export async function getAuthDescriptorSignersFiltered(
  connection: Connection,
  authDescriptorSignerFilter: AuthDescriptorSignerFilter = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AuthDescriptorSigner>> {
  return retrievePaginatedEntity<
    AuthDescriptorSigner,
    AuthDescriptorSignerResponse
  >(
    connection,
    authDescriptorSignersFiltered(authDescriptorSignerFilter, limit, cursor),
    (authDescriptorSigners) =>
      authDescriptorSigners.map((authDescriptorSigner) =>
        mapAuthDescriptorsSigner(authDescriptorSigner),
      ),
  );
}

/**
 * Retrieves a paginated list of rate limit states filtered by the specified criteria.
 *
 * @param connection - The database connection to use for the query.
 * @param rlStateFilter - The filter criteria for rate limit states. Defaults to null.
 * @param limit - The maximum number of results to return. Defaults to null.
 * @param cursor - The cursor for pagination. Defaults to null.
 * @returns A promise that resolves to a paginated entity containing the filtered rate limit states.
 */
export async function getRlStatesFiltered(
  connection: Connection,
  rlStateFilter: RlStateFilter = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<RlState>> {
  return retrievePaginatedEntity<RlState, RateLimitStateResponse>(
    connection,
    rlStatesFiltered(rlStateFilter, limit, cursor),
    (rlStates) => rlStates.map((rlState) => mapRlState(rlState)),
  );
}

/**
 * Retrieves a paginated list of account creation transfers based on the provided filter, limit, and cursor.
 *
 * @param connection - The database connection to use for the query.
 * @param accountCreationTransferFilter - An optional filter to apply to the account creation transfers.
 * @param limit - An optional limit on the number of results to return.
 * @param cursor - An optional cursor for pagination.
 * @returns A promise that resolves to a paginated entity containing account creation transfers.
 */
export async function getAccountCreationTransfersFiltered(
  connection: Connection,
  accountCreationTransferFilter: AccountCreationTransferFilter = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AccountCreationTransfer>> {
  return retrievePaginatedEntity<
    AccountCreationTransfer,
    AccountCreationTransferResponse
  >(
    connection,
    accountCreationTransfersFiltered(
      accountCreationTransferFilter,
      limit,
      cursor,
    ),
    (accountCreationTransfers) =>
      accountCreationTransfers.map((accountCreationTransfer) =>
        mapAccountCreationTransfer(accountCreationTransfer),
      ),
  );
}

/**
 * Retrieves a paginated list of account links based on the provided filter, limit, and cursor.
 *
 * @param connection - The database connection object.
 * @param accountLinkFilter - An optional filter to apply to the account links.
 * @param limit - An optional limit on the number of results to return.
 * @param cursor - An optional cursor for pagination.
 * @returns A promise that resolves to a paginated entity containing account links with primary and secondary accounts.
 */
export async function getAccountLinksFiltered(
  connection: Connection,
  accountLinkFilter: AccountLinkFilter = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<{ account: Account; secondary: Account }>> {
  return retrievePaginatedEntity<
    { account: Account; secondary: Account },
    AccountLinkResponse
  >(
    connection,
    accountLinksFiltered(accountLinkFilter, limit, cursor),
    (accountLinkResponses) =>
      accountLinkResponses.map((accountLinkResponse) => ({
        account: createAccountObject(connection, accountLinkResponse.account),
        secondary: createAccountObject(
          connection,
          accountLinkResponse.secondary,
        ),
      })),
  );
}

/**
 * Retrieves a paginated list of subscriptions based on the provided filter, limit, and cursor.
 *
 * @param {Connection} connection - The database connection to use for the query.
 * @param {SubscriptionFilter} [subscriptionFilter=null] - The filter criteria to apply to the subscriptions.
 * @param {OptionalLimit} [limit=null] - The maximum number of subscriptions to retrieve.
 * @param {OptionalPageCursor} [cursor=null] - The cursor for pagination.
 * @returns {Promise<PaginatedEntity<Subscription>>} A promise that resolves to a paginated list of subscriptions.
 */
export async function getSubscriptionsFiltered(
  connection: Connection,
  subscriptionFilter: SubscriptionFilter = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Subscription>> {
  return retrievePaginatedEntity<Subscription, SubscriptionResponse>(
    connection,
    subscriptionsFiltered(subscriptionFilter, limit, cursor),
    (subscriptions) =>
      subscriptions.map((subscription) => mapSubscription(subscription)),
  );
}

/**
 * Fetches an account by its id
 * @param connection - the blockchain connection to use
 * @param id - id of the account to fetch
 * @returns the account with the specified id, or null if no such account exists
 */
export async function getById(
  connection: Connection,
  id: BufferId,
): Promise<Account | null> {
  const account = await connection.query(accountById(id));

  return account && createAccountObject(connection, account.id);
}

/**
 * Fetches all accounts that the provided signer has access to as a paginated entity
 * @param connection - the blockchain connection to use
 * @param id - signer pubkey or evm address (without `0x`-prefix)
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export async function getBySigner(
  connection: Connection,
  id: BufferId,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Account>> {
  return retrievePaginatedEntity<Account, { id: Buffer }>(
    connection,
    accountsBySigner(id, limit, cursor),
    (accounts) =>
      accounts.map((acc) => createAccountObject(connection, acc.id)),
  );
}

/**
 * Fetches all accounts associated with the specified auth descriptor id as a paginated entity
 * @param connection - the blockchain connection to use
 * @param id - id of the auth descriptor to fetch associated accounts for
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export async function getByAuthDescriptorId(
  connection: Connection,
  id: BufferId,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Account>> {
  return retrievePaginatedEntity<Account, Buffer>(
    connection,
    accountsByAuthDescriptorId(id, limit, cursor),
    (accounts) => accounts.map((acc) => createAccountObject(connection, acc)),
  );
}

/**
 * Fetches all accounts of a specific type as a paginated entity
 * @param connection - the blockchain connection to use
 * @param type - the type of account to fetch
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export async function getByType(
  connection: Connection,
  type: string,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Account>> {
  return retrievePaginatedEntity<Account, Buffer>(
    connection,
    Query.accountsByType(type, limit, cursor),
    (accounts) =>
      accounts.map((account) => createAccountObject(connection, account)),
  );
}

export async function isAuthDescriptorValid(
  queryable: Queryable,
  accountId: BufferId,
  authDescriptorId: BufferId,
): Promise<boolean> {
  return (await queryable.query(
    Query.isAuthDescriptorValid(accountId, authDescriptorId),
  ))!;
}

export async function getAuthDescriptorsBySigner(
  queryable: Queryable,
  accountId: BufferId,
  signer: BufferId,
): Promise<AnyAuthDescriptor[]> {
  const authDescriptors = await queryable.query(
    accountAuthDescriptorsBySigner(accountId, signer),
  );

  return authDescriptors ? gtv.mapAuthDescriptorsFromGtv(authDescriptors) : [];
}

export async function getAuthDescriptors(
  queryable: Queryable,
  accountId: BufferId,
): Promise<AnyAuthDescriptor[]> {
  const authDescriptors = await queryable.query(
    accountAuthDescriptors(accountId),
  );
  return authDescriptors ? gtv.mapAuthDescriptorsFromGtv(authDescriptors) : [];
}

export async function getAuthDescriptorById(
  queryable: Queryable,
  accountId: BufferId,
  authDescriptorId: BufferId,
): Promise<AnyAuthDescriptor> {
  const authDescriptor = await queryable.query(
    authDescriptorById(accountId, authDescriptorId),
  );
  return gtv.authDescriptorFromGtv(authDescriptor);
}

/**
 * Fetches the main auth descriptor of an account
 * @param queryable - the client to use to access the blockchain
 * @param accountId - id of the account to fetch main auth descriptor for
 * @remarks Throws an error if an account with the specified id does not exist
 */
export async function getAccountMainAuthDescriptor(
  queryable: Queryable,
  accountId: BufferId,
): Promise<AnyAuthDescriptor> {
  const authDescriptor = await queryable.query(
    Query.accountMainAuthDescriptor(accountId),
  );

  return gtv.authDescriptorFromGtv(authDescriptor);
}

/**
 * Converts an AccountResponse
 * @param account the account to map
 * @returns The id and type of the account
 */
export function createAccountObjectFiltered(
  account: AccountResponse,
): AccountResponse {
  return Object.freeze({
    id: account.id,
    type: account.type,
  });
}

/**
 * Converts a `AuthDescriptorSignerResponse`, returned from the blockchain to a `AuthDescriptorSigner` type
 * which can be used in the dApp
 * @param authDescriptorSigner - the type to convert
 */
function mapAuthDescriptorsSigner(
  authDescriptorSigner: AuthDescriptorSignerResponse,
): AuthDescriptorSigner {
  return {
    id: authDescriptorSigner.id,
    accountAuthDescriptorId: authDescriptorSigner.account_auth_descriptor_id,
    accountId: authDescriptorSigner.account_id,
    accountType: authDescriptorSigner.account_type,
    accountAuthDescriptorAuthType:
      authDescriptorSigner.account_auth_descriptor_auth_type,
    accountAuthDescriptorArgs:
      authDescriptorSigner.account_auth_descriptor_args,
    accountAuthDescriptorRules:
      authDescriptorSigner.account_auth_descriptor_rules,
    accountAuthDescriptorCreated:
      authDescriptorSigner.account_auth_descriptor_created,
    accountAuthDescriptorCtr: authDescriptorSigner.account_auth_descriptor_ctr,
  };
}

/**
 * Converts a `RateLimitStateResponse`, returned from the blockchain to a `RlState` type
 * which can be used in the dApp
 * @param rlState - the type to convert
 */
function mapRlState(rlState: RateLimitStateResponse): RlState {
  return {
    accountId: rlState.account_id,
    accountType: rlState.account_type,
    points: rlState.points,
    lastUpdate: rlState.lastUpdate,
    recoveryTime: rlState.recovery_time,
  };
}

/**
 * Converts a `AccountCreationTransferResponse`, returned from the blockchain to a `AccountCreationTransfer` type
 * which can be used in the dApp
 * @param accountCreationTransfer - the type to convert
 */
function mapAccountCreationTransfer(
  accountCreationTransfer: AccountCreationTransferResponse,
): AccountCreationTransfer {
  return {
    transactionTxRid: accountCreationTransfer.transaction_tx_rid,
    senderBlockchainRid: accountCreationTransfer.sender_blockchain_rid,
    senderId: accountCreationTransfer.sender_id,
    recipientId: accountCreationTransfer.recipient_id,
    assetId: accountCreationTransfer.asset_id,
    assetName: accountCreationTransfer.asset_name,
    assetSymbol: accountCreationTransfer.asset_symbol,
    assetDecimals: accountCreationTransfer.asset_decimals,
    assetIssuingBlockchainRid:
      accountCreationTransfer.asset_issuing_blockchain_rid,
    assetIconUrl: accountCreationTransfer.asset_icon_url,
    assetType: accountCreationTransfer.asset_type,
    assetTotalSupply: accountCreationTransfer.asset_total_supply,
    assetUniquenessResolver: accountCreationTransfer.asset_uniqueness_resolver,
    amount: accountCreationTransfer.amount,
    timestamp: accountCreationTransfer.timestamp,
    state: accountCreationTransfer.state,
    finalTxRid: accountCreationTransfer.final_tx_rid,
    finalOpIndex: accountCreationTransfer.final_op_index,
  };
}

/**
 * Converts a `SubscriptionResponse`, returned from the blockchain to a `Subscription` type
 * which can be used in the dApp
 * @param subscription - the type to convert
 */
function mapSubscription(subscription: SubscriptionResponse): Subscription {
  return {
    subscriptionAccountId: subscription.subscription_account_id,
    subscriptionAccountType: subscription.subscription_account_type,
    subscriptionAssetId: subscription.subscription_asset_id,
    subscriptionAssetName: subscription.subscription_asset_name,
    subscriptionAssetSymbol: subscription.subscription_asset_symbol,
    subscriptionAssetDecimals: subscription.subscription_asset_decimals,
    subscriptionAssetIssuingBlockchainRid:
      subscription.subscription_asset_issuing_blockchain_rid,
    subscriptionAsseticonUrl: subscription.subscription_asset_icon_url,
    subscriptionAssetType: subscription.subscription_asset_type,
    subscriptionAssetuniquenessResolver:
      subscription.subscription_asset_uniqueness_resolver,
    periodMillis: subscription.period_millis,
    lastPayment: subscription.last_payment,
  };
}

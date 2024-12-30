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
} from "./queries";
import { AnyAuthDescriptor, gtv } from "./auth-descriptor";
import {
  CrosschainTransferHistoryEntry,
  CrosschainTransferhistoryEntryResponse,
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
  createTransferHistoryEntryFromResponse,
} from "./transfer-history";
import { Account, RateLimit } from "./types";
import { getCrosschainTransferHistoryEntries as getCrosschainTransferHistoryEntriesFiltered } from "@ft4/crosschain/queries";
import { createCrosschainTransferHistoryEntryObject } from "@ft4/asset/asset-query-functions";

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
    getCrosschainTransferHistoryEntriesFiltered: async (
      limit: OptionalLimit = null,
      cursor: OptionalPageCursor = null,
    ) => {
      return retrievePaginatedEntity<
        CrosschainTransferHistoryEntry,
        CrosschainTransferhistoryEntryResponse
      >(
        connection,
        getCrosschainTransferHistoryEntriesFiltered(limit, cursor),
        (entries) =>
          entries.map((entry) =>
            createCrosschainTransferHistoryEntryObject(entry),
          ),
      );
    },
  });
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
  const accountId = await connection.query(accountById(id));

  return accountId && createAccountObject(connection, accountId);
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

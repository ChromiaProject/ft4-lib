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
  transferHistory,
} from "./queries";
import { AnyAuthDescriptor, gtv } from "./auth-descriptor";
import {
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
  createTransferHistoryEntryFromResponse,
} from "./transfer-history";
import { Account, RateLimit } from "./types";

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

export function createAccountObject(
  connection: Connection,
  accountId: BufferId,
): Account {
  return Object.freeze({
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

export async function getById(
  connection: Connection,
  id: BufferId,
): Promise<Account | null> {
  const accountId = await connection.query(accountById(id));

  return accountId && createAccountObject(connection, accountId);
}

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

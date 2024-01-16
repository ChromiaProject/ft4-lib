import { Buffer } from "buffer";
import { formatter, IClient } from "postchain-client";
import {
  getBalanceByAccountId,
  getBalancesByAccountId,
} from "../asset/asset-query-functions";
import { Connection, OptionalPageCursor } from "../types";
import { getConfig } from "@ft4/utils/index";
import { retrievePaginatedEntity } from "@ft4/utils/entity-retriever";
import { BufferId, PaginatedEntity } from "@ft4/utils/types";
import * as Query from "./account-queries";
import {
  accountAuthDescriptors,
  accountAuthDescriptorsBySigner,
  accountById,
  accountsByAuthDescriptorId,
  accountsBySigner,
  RateLimitQuery,
  transferHistory,
} from "./account-queries";
import {
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
} from "./transfer-history/types";
import { Account, RateLimit } from "./types";
import { AnyAuthDescriptor, gtv } from "@ft4/accounts/auth-descriptor";
import { RawAnyAuthDescriptor } from "./auth-descriptor/types";
import {
  PendingTransfer,
  PendingTransferResponse,
  pendingTransfersForAccount,
} from "../crosschain";
import { mapPendingTransfers } from "../crosschain/query-functions";
import { mapAuthDescriptorsFromGtv } from "./auth-descriptor/gtv";
import { createTransferHistoryEntryFromResponse } from "./transfer-history/transfer-history-entry";

//this will be outdated as soon as another tx is sent to the same account:
//does it make sense for the users to have it? Who needs this info?
export async function getRateLimit(
  session: IClient,
  accountId: BufferId,
): Promise<RateLimit> {
  const rateLimitResponse = await session.query(RateLimitQuery(accountId));
  const rateLimit = {
    points: rateLimitResponse.points,
    lastUpdate: new Date(rateLimitResponse.lastUpdate),
  };

  const chainInfo = await getConfig(session);

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
    getBalances: (limit = 100, cursor: OptionalPageCursor = null) =>
      getBalancesByAccountId(connection, accountId, limit, cursor),
    isAuthDescriptorValid: (authDescriptorId: BufferId) =>
      isAuthDescriptorValid(connection, accountId, authDescriptorId),
    getAuthDescriptors: async (
      limit = 100,
      cursor: OptionalPageCursor = null,
    ) => {
      return retrievePaginatedEntity<AnyAuthDescriptor, RawAnyAuthDescriptor>(
        connection,
        accountAuthDescriptors(accountId, limit, cursor),
        gtv.mapAuthDescriptorsFromGtv,
      );
    },
    getAuthDescriptorsBySigner: (signer: BufferId) =>
      getAuthDescriptorsBySigner(connection, accountId, signer),
    getRateLimit: () => getRateLimit(connection.client, accountId),
    getTransferHistory: async (
      limit = 100,
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
      limit = 100,
      cursor: OptionalPageCursor = null,
    ) => {
      return retrievePaginatedEntity<PendingTransfer, PendingTransferResponse>(
        connection,
        pendingTransfersForAccount(accountId, limit, cursor),
        mapPendingTransfers,
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
  limit = 100,
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
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Account>> {
  return retrievePaginatedEntity<Account, Buffer>(
    connection,
    accountsByAuthDescriptorId(id, limit, cursor),
    (accounts) => accounts.map((acc) => createAccountObject(connection, acc)),
  );
}

export async function isAuthDescriptorValid(
  connection: Connection,
  accountId: BufferId,
  authDescriptorId: BufferId,
): Promise<boolean> {
  return (await connection.query(
    Query.isAuthDescriptorValid(accountId, authDescriptorId),
  ))!;
}

export async function getAuthDescriptorsBySigner(
  connection: Connection,
  accountId: BufferId,
  signer: BufferId,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AnyAuthDescriptor>> {
  return retrievePaginatedEntity<AnyAuthDescriptor, RawAnyAuthDescriptor>(
    connection,
    accountAuthDescriptorsBySigner(accountId, signer, limit, cursor),
    (authDescriptors) =>
      authDescriptors ? mapAuthDescriptorsFromGtv(authDescriptors) : [],
  );
}

import { formatter, IClient } from "postchain-client";
import {
  accountById,
  accountsByParticipantId,
  RateLimitQuery,
  accountAuthDescriptors,
  accountAuthDescriptorsByParticipantId,
  accountsByAuthDescriptorId,
} from "./account-queries";
import * as Query from "./account-queries";
import { Account, RateLimit } from "./types";
import { BufferId } from "../../cryptoUtils";
import { getConfig } from "../utils";
import {
  getBalanceByAccountId,
  createBalanceObject,
} from "../asset/asset-query-functions";
import { Connection, OptionalPageCursor } from "../types";
import { createTransferHistoryRetriever } from "./transfer-history/transfer-history-retrieval";
import { TransferHistoryFilter } from "./transfer-history/types";
import {
  AuthDescriptor,
  AuthDescriptorResponse,
  mapAuthDescriptors,
} from "./auth-descriptor";
import { createEntityRetriever } from "../utils/entity-retriever";
import { Balance, BalanceResponse } from "../asset/types";
import { balancesByAccountId } from "../asset/asset-queries";
import { Buffer } from "buffer";
import { PaginatedEntity } from "../utils/types";

//this will be outdated as soon as another tx is sent to the same account:
//does it make sense for the users to have it? Who needs this info?
export async function getRateLimit(
  session: IClient,
  accountId: BufferId,
): Promise<RateLimit> {
  const rateLimit = await session.query(RateLimitQuery(accountId));

  const chainInfo = await getConfig(session);

  return Object.freeze({
    points: rateLimit.points,
    lastUpdate: rateLimit.lastUpdate,
    getAvailablePoints: () => {
      if (chainInfo.rateLimit.active) {
        const deltaTime = Date.now() - rateLimit.lastUpdate;
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
  const transferHistoryRetriever = createTransferHistoryRetriever(
    connection.client,
    accountId,
  );
  return Object.freeze({
    id: formatter.ensureBuffer(accountId),
    getBalanceByAssetId: (assetId: BufferId) =>
      getBalanceByAccountId(connection, accountId, assetId),
    getBalances: (limit = 100, cursor: OptionalPageCursor = null) => {
      const retriever = createEntityRetriever<Balance, BalanceResponse>(
        connection,
        balancesByAccountId(accountId, limit, cursor),
        (balances) => balances.map(createBalanceObject),
      );
      return retriever.retrieve(limit, cursor);
    },
    isAuthDescriptorValid: (authDescriptorId: BufferId) =>
      isAuthDescriptorValid(connection, accountId, authDescriptorId),
    getAuthDescriptors: async (
      limit = 100,
      cursor: OptionalPageCursor = null,
    ) => {
      const retriever = createEntityRetriever<
        AuthDescriptor,
        AuthDescriptorResponse
      >(
        connection,
        accountAuthDescriptors(accountId, limit, cursor),
        mapAuthDescriptors,
      );
      return retriever.retrieve(limit, cursor);
    },
    getAuthDescriptorsByParticipantId: (participantId: BufferId) =>
      getAuthDescriptorsByParticipantId(connection, accountId, participantId),
    getRateLimit: () => getRateLimit(connection.client, accountId),
    getTransferHistory: async (
      limit = 100,
      filter: TransferHistoryFilter = {},
      cursor: OptionalPageCursor = null,
    ) => {
      return transferHistoryRetriever.retrieve(limit, filter, cursor);
    },
    getTransferHistoryEntry: async (rowid: number) =>
      transferHistoryRetriever.retrieveSingle(rowid),
  });
}

export async function getById(
  connection: Connection,
  id: BufferId,
): Promise<Account | null> {
  const accountId = await connection.query(accountById(id));

  return accountId && createAccountObject(connection, accountId);
}

export async function getByParticipantId(
  connection: Connection,
  id: BufferId,
): Promise<Account[]> {
  const accountIds = await connection.query(accountsByParticipantId(id));

  return accountIds.map((id) => createAccountObject(connection, id));
}

export async function getByAuthDescriptorId(
  connection: Connection,
  id: BufferId,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Account>> {
  return createEntityRetriever<Account, Buffer>(
    connection,
    accountsByAuthDescriptorId(id, limit, cursor),
    (accounts) => accounts.map((acc) => createAccountObject(connection, acc)),
  ).retrieve();
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

export async function getAuthDescriptorsByParticipantId(
  connection: Connection,
  accountId: BufferId,
  participantId: BufferId,
): Promise<AuthDescriptor[]> {
  return connection
    .query(accountAuthDescriptorsByParticipantId(accountId, participantId))
    .then((authDescriptors) =>
      authDescriptors ? mapAuthDescriptors(authDescriptors) : [],
    );
}

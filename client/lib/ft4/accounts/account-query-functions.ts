import { GtxClient, formatter, IClient } from "postchain-client";
import {
  accountAuthDescriptorsQuery,
  accountById,
  accountByIdQuery,
  accountsByAuthDescriptorId,
  accountsByAuthDescriptorIdQuery,
  accountsByParticipantId,
  accountsByParticipantIdQuery,
  getRateLimitQuery,
  isAuthDescriptorValidQuery,
  accountAuthDescriptors,
  accountAuthDescriptorsByParticipantId,
  accountAuthDescriptorsPaginated,
  accountsByAuthDescriptorIdPaginated,
} from "./account-queries";
import * as Query from "./account-queries";
import { Account, IAccount, RateLimit } from "./types";
import { BufferId } from "../../cryptoUtils";
import { _getConfig, getConfig } from "../utils";
import {
  _getBalanceByAccountId,
  _getBalancesByAccountId,
  createBalanceObject,
  getBalancesByAccountId,
} from "../asset/asset-query-functions";
import { Connection, OptionalPageCursor } from "../types";
import { createTransferHistoryRetriever } from "./transfer-history/transfer-history-retrieval";
import { TransferHistoryFilter } from "./transfer-history/types";
import {
  AuthDescriptor,
  RawAuthDescriptor,
  mapAuthDescriptors,
} from "./auth-descriptor";
import { createEntityRetriever } from "../utils/entity-retriever";
import { Balance, BalanceResponse } from "../asset/types";
import { balancesByAccountIdPaginated } from "../asset/asset-queries";
import { Buffer } from "buffer";
import { PaginatedEntity } from "../utils/types";

export async function getByParticipantId( //"by pubKey" would be more descriptive?
  session: GtxClient,
  id: BufferId
): Promise<Account[]> {
  const accountIds = await session.query(
    ...accountsByParticipantIdQuery(formatter.ensureBuffer(id))
  );
  return await createAccountObjectsFromIds(session, accountIds);
}

export async function getByAuthDescriptorId(
  session: GtxClient,
  id: BufferId
): Promise<Account[]> {
  const accountIds = await session.query(
    ...accountsByAuthDescriptorIdQuery(formatter.ensureBuffer(id))
  );
  return await createAccountObjectsFromIds(session, accountIds);
}

export async function isAuthDescriptorValid(
  session: GtxClient,
  accountId: BufferId,
  authDescId: BufferId
): Promise<boolean> {
  return await session.query(
    ...isAuthDescriptorValidQuery(
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDescId)
    )
  );
}

export async function getByIds(
  session: GtxClient,
  ids: BufferId[]
): Promise<Account[]> {
  const accounts = await Promise.all(ids.map((id) => getById(session, id)));
  return accounts.filter((account): account is Account => account != null);
}

export async function getById(
  session: GtxClient,
  id: BufferId
): Promise<Account | null> {
  const accountId = await session.query(
    ...accountByIdQuery(formatter.ensureBuffer(id))
  );
  if (!accountId) return null;
  return await createAccountObjectFromId(session, accountId);
}

//to be preferred internally since getById checks if the account exists
async function createAccountObjectFromId(
  session: GtxClient,
  accountId: BufferId
): Promise<Account> {
  const id = formatter.ensureBuffer(accountId);
  const [balances, authDescriptors] = await Promise.all([
    getBalancesByAccountId(session, id),
    getAuthDescriptors(session, id).then(mapAuthDescriptors),
  ]);
  return Object.freeze({
    balances,
    authDescriptors,
    id,
  });
}

//to be preferred internally since getByIds checks if the accounts exist
async function createAccountObjectsFromIds(
  session: GtxClient,
  accountIds: BufferId[]
): Promise<Account[]> {
  return await Promise.all(
    accountIds.map((id) => createAccountObjectFromId(session, id))
  );
}

export async function getAuthDescriptors(
  session: GtxClient,
  accountId: BufferId
): Promise<RawAuthDescriptor[]> {
  return session.query(
    ...accountAuthDescriptorsQuery(formatter.ensureBuffer(accountId))
  );
}

//this will be outdated as soon as another tx is sent to the same account:
//does it make sense for the users to have it? Who needs this info?
export async function getRateLimit(
  session: GtxClient,
  accountId: BufferId
): Promise<RateLimit> {
  const q = getRateLimitQuery(accountId);
  const rateLimit = await session.query(q.name, q.args);

  const chainInfo = await getConfig(session);

  return Object.freeze({
    points: rateLimit.points,
    lastUpdate: rateLimit.lastUpdate,
    getAvailablePoints: () => {
      if (chainInfo.rate_limit_active) {
        const deltaTime = Date.now() - rateLimit.lastUpdate;
        const points =
          rateLimit.points + deltaTime / chainInfo.rate_limit_recovery_time;
        return Math.min(points, chainInfo.rate_limit_max_points);
      }
      return null;
    },
  });
}
export async function _getRateLimit(
  session: IClient,
  accountId: BufferId
): Promise<RateLimit> {
  const rateLimit = await session.query<
    { account_id: Buffer },
    Omit<RateLimit, "getAvailablePoints">
  >(getRateLimitQuery(accountId));

  const chainInfo = await _getConfig(session);

  return Object.freeze({
    points: rateLimit.points,
    lastUpdate: rateLimit.lastUpdate,
    getAvailablePoints: () => {
      if (chainInfo.rate_limit_active) {
        const deltaTime = Date.now() - rateLimit.lastUpdate;
        const points =
          rateLimit.points + deltaTime / chainInfo.rate_limit_recovery_time;
        return Math.min(points, chainInfo.rate_limit_max_points);
      }
      return null;
    },
  });
}

export function createAccountObject(
  connection: Connection,
  accountId: BufferId
): IAccount {
  const transfer_history_retriever = createTransferHistoryRetriever(
    connection.client,
    accountId
  );
  return Object.freeze({
    id: formatter.ensureBuffer(accountId),
    getBalanceByAssetId: (assetId: BufferId) =>
      _getBalanceByAccountId(connection, accountId, assetId),
    getBalances: () => _getBalancesByAccountId(connection, accountId),
    getBalancesPaginated: (limit = 100, cursor: OptionalPageCursor = null) => {
      const retriever = createEntityRetriever<Balance, BalanceResponse>(
        connection,
        balancesByAccountIdPaginated(accountId, limit, cursor),
        (balances) => balances.map(createBalanceObject)
      );
      return retriever.retrieve(limit, cursor);
    },
    isAuthDescriptorValid: (authDescriptorId: BufferId) =>
      _isAuthDescriptorValid(connection, accountId, authDescriptorId),
    getAuthDescriptors: () => _getAuthDescriptors(connection, accountId),
    getAuthDescriptorsPaginated: async (
      limit = 100,
      cursor: OptionalPageCursor = null
    ) => {
      const retriever = createEntityRetriever<
        AuthDescriptor,
        RawAuthDescriptor
      >(
        connection,
        accountAuthDescriptorsPaginated(accountId, limit, cursor),
        mapAuthDescriptors
      );
      return retriever.retrieve(limit, cursor);
    },
    getAuthDescriptorsByParticipantId: (participantId: BufferId) =>
      getAuthDescriptorsByParticipantId(connection, accountId, participantId),
    getRateLimit: () => _getRateLimit(connection.client, accountId),
    getTransferHistory: async (
      limit = 100,
      filter: TransferHistoryFilter = {},
      cursor: OptionalPageCursor = null
    ) => {
      return transfer_history_retriever.retrieve(limit, filter, cursor);
    },
    getTransferHistoryEntry: async (rowid: number) =>
      transfer_history_retriever.retrieveSingle(rowid),
  });
}

export async function _getById(
  connection: Connection,
  id: BufferId
): Promise<IAccount | null> {
  const accountId = await connection.query<Buffer>(accountById(id));

  return accountId && createAccountObject(connection, accountId);
}

export async function _getByParticipantId(
  connection: Connection,
  id: BufferId
): Promise<IAccount[]> {
  const accountIds =
    (await connection.query<Buffer[]>(accountsByParticipantId(id))) ?? [];

  return accountIds.map((id) => createAccountObject(connection, id));
}

export async function _getByAuthDescriptorId(
  connection: Connection,
  id: BufferId
): Promise<IAccount[]> {
  const accountIds =
    (await connection.query<Buffer[]>(accountsByAuthDescriptorId(id))) ?? [];
  return accountIds.map((id) => createAccountObject(connection, id));
}

export async function _getByAuthDescriptorIdPaginated(
  connection: Connection,
  id: BufferId,
  limit = 100,
  cursor: OptionalPageCursor = null
): Promise<PaginatedEntity<IAccount>> {
  return createEntityRetriever<IAccount, Buffer>(
    connection,
    accountsByAuthDescriptorIdPaginated(id, limit, cursor),
    (accounts) => accounts.map((acc) => createAccountObject(connection, acc))
  ).retrieve();
}

export async function _isAuthDescriptorValid(
  connection: Connection,
  accountId: BufferId,
  authDescriptorId: BufferId
): Promise<boolean> {
  return (await connection.query<boolean>(
    Query.isAuthDescriptorValid(accountId, authDescriptorId)
  ))!;
}

export async function _getAuthDescriptors(
  connection: Connection,
  accountId: BufferId
): Promise<AuthDescriptor[]> {
  return connection
    .query<RawAuthDescriptor[]>(
      accountAuthDescriptors(formatter.ensureBuffer(accountId))
    )
    .then((authDescriptors) =>
      authDescriptors ? mapAuthDescriptors(authDescriptors) : []
    );
}

export async function getAuthDescriptorsByParticipantId(
  connection: Connection,
  accountId: BufferId,
  participantId: BufferId
): Promise<AuthDescriptor[]> {
  return connection
    .query<RawAuthDescriptor[]>(
      accountAuthDescriptorsByParticipantId(accountId, participantId)
    )
    .then((authDescriptors) =>
      authDescriptors ? mapAuthDescriptors(authDescriptors) : []
    );
}

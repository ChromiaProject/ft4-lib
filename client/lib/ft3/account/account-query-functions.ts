import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
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
} from "./account-queries";
import * as Query from "./account-queries";
import { Account, IAccount, RateLimit } from "./types";
import { BufferId } from "../../cryptoUtils";
import { getChainInfo } from "../utils";
import {
  _getBalanceByAccountId,
  _getBalancesByAccountId,
  getBalancesByAccountId,
} from "../asset/asset-query-functions";
import { Connection, PageCursor } from "../types";
import { formatter } from "postchain-client";
import { PaymentHistoryFilter } from "./payment-history/types";
import { createPaymentHistoryRetriever } from "./payment-history/payment-history-retrieval";
import {
  GtvAuthDescriptor,
  AuthDescriptor,
  RawAuthDescriptor,
} from "./auth-descriptor/types";
import { mapAuthDescriptors } from "./auth-descriptor";
import { createConnection } from "../ft-session";

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
  return <Account[]>accounts.filter((account) => account != null);
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
    _getAuthDescriptors(createConnection(session), id),
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
): Promise<GtvAuthDescriptor[]> {
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
  const rateLimit = await session.query(
    ...getRateLimitQuery(formatter.ensureBuffer(accountId))
  );

  const chainInfo = await getChainInfo(session);

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
  const retriever = createPaymentHistoryRetriever(connection.client, accountId);
  return Object.freeze({
    id: accountId,
    getBalanceByAssetId: (assetId: BufferId) =>
      _getBalanceByAccountId(connection, accountId, assetId),
    getBalances: () => _getBalancesByAccountId(connection, accountId),
    isAuthDescriptorValid: (authDescriptorId: BufferId) =>
      _isAuthDescriptorValid(connection, accountId, authDescriptorId),
    getAuthDescriptors: () => _getAuthDescriptors(connection, accountId),
    getAuthDescriptorsByParticipantId: (participantId: BufferId) =>
      getAuthDescriptorsByParticipantId(connection, accountId, participantId),
    getRateLimit: () => getRateLimit(connection.client, accountId),
    getTransferHistory: async (
      limit = 100,
      filter: PaymentHistoryFilter = {},
      cursor: PageCursor | null = null
    ) => {
      return retriever.retrieve(limit, filter, cursor);
    },
    getTransferHistoryEntry: async (rowid: number) =>
      retriever.retrieveSingle(rowid),
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

import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import {
  accountAuthDescriptorsQuery,
  accountByIdQuery,
  accountsByAuthDescriptorIdQuery,
  accountsByParticipantIdQuery,
  getRateLimitQuery,
  isAuthDescriptorValidQuery,
} from "./account-queries";
import { Account, RateLimit } from "./types";
import { BufferId } from "../../cryptoUtils";
import { ensureBuffer } from "postchain-client/built/src/formatter";
import { AuthDescriptor } from "./auth-descriptor/types";
import { getChainInfo } from "../utils";
import { getBalancesByAccountId } from "../asset/asset-query-functions";

export async function getByParticipantId( //"by pubKey" would be more descriptive?
  id: BufferId,
  session: GtxClient
): Promise<(Account | null)[]> {
  const accountIds = await session.query(
    accountsByParticipantIdQuery(ensureBuffer(id))
  );
  return await createAccountObjectsFromIds(accountIds, session);
}

export async function getByAuthDescriptorId(
  id: BufferId,
  session: GtxClient
): Promise<(Account | null)[]> {
  const accountIds = await session.query(
    accountsByAuthDescriptorIdQuery(ensureBuffer(id))
  );
  return await createAccountObjectsFromIds(accountIds, session);
}

export async function isAuthDescriptorValid(
  accountId: BufferId,
  authDescId: BufferId,
  session: GtxClient
): Promise<boolean> {
  return await session.query(
    isAuthDescriptorValidQuery(
      ensureBuffer(accountId),
      ensureBuffer(authDescId)
    )
  );
}

export async function getByIds(
  ids: BufferId[],
  session: GtxClient
): Promise<(Account | null)[]> {
  return Promise.all(ids.map((id) => getById(id, session)));
}

export async function getById(
  id: BufferId,
  session: GtxClient
): Promise<Account | null> {
  const accountId = await session.query(accountByIdQuery(ensureBuffer(id)));
  if (!accountId) return null;
  return await createAccountObjectFromId(accountId, session);
}

//to be preferred internally since getById checks if the account exists
async function createAccountObjectFromId(
  accountId: BufferId,
  session: GtxClient
): Promise<Account> {
  const id = ensureBuffer(accountId);
  const [balances, authDescriptors] = await Promise.all([
    getBalancesByAccountId(id, session),
    getAuthDescriptors(id, session),
  ]);
  return Object.freeze({
    balances,
    authDescriptors,
    id,
  });
}

//to be preferred internally since getByIds checks if the accounts exist
async function createAccountObjectsFromIds(
  accountIds: BufferId[],
  session: GtxClient
): Promise<Account[]> {
  return await Promise.all(
    accountIds.map((id) => createAccountObjectFromId(id, session))
  );
}

export async function getAuthDescriptors(
  accountId: BufferId,
  session: GtxClient
): Promise<AuthDescriptor[]> {
  return await session.query(
    accountAuthDescriptorsQuery(ensureBuffer(accountId))
  );
}

//this will be outdated as soon as another tx is sent to the same account:
//does it make sense for the users to have it? Who needs this info?
export async function getRateLimit(
  accountId: BufferId,
  session: GtxClient
): Promise<RateLimit> {
  const rateLimit = await session.query(
    getRateLimitQuery(ensureBuffer(accountId))
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

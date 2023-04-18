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
import { AuthDescriptor } from "./auth-descriptor/types";
import { getChainInfo } from "../utils";
import { getBalancesByAccountId } from "../asset/asset-query-functions";
import { formatter } from "postchain-client";

export async function getByParticipantId( //"by pubKey" would be more descriptive?
  session: GtxClient,
  id: BufferId
): Promise<(Account | null)[]> {
  const accountIds = await session.query(
    ...accountsByParticipantIdQuery(formatter.ensureBuffer(id))
  );
  return await createAccountObjectsFromIds(session, accountIds);
}

export async function getByAuthDescriptorId(
  session: GtxClient,
  id: BufferId
): Promise<(Account | null)[]> {
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
): Promise<(Account | null)[]> {
  return Promise.all(ids.map((id) => getById(session, id)));
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
    getAuthDescriptors(session, id),
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
): Promise<AuthDescriptor[]> {
  return await session.query(
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

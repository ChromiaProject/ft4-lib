import { Connection, OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { BufferId, PaginatedEntity, retrievePaginatedEntity } from "@ft4/utils";
import { Queryable } from "postchain-client";
import {
  LockedBalanceResponse,
  LockedAmountResponse,
  LockedAggregatedBalanceResponse,
  LockedAggregatedBalance,
  LockedBalance,
  LockedAmount,
  LockAccountResponse,
  LockAccount,
} from "./types";
import {
  lockAccounts,
  lockAccountsWithNonZeroBalances,
  lockedAssetAggregatedBalance,
  lockedAssetAggregatedBalances,
  lockedAssetBalance,
  lockedAssetBalances,
} from "./queries";
import {
  createAssetObject,
  createAmountFromBalance,
  getAssetById,
  Amount,
} from "@ft4/asset";
import { createAccountObject } from "@ft4/accounts";

/**
 * Returns all lock account associated with a specific account
 * @param connection - the connection to use when calling the blockchain
 * @param accountId - the id of the account for which to fetch lock accounts
 * @returns a list of lock accounts. The list will be empty in case of no lock accounts
 */
export async function getLockAccounts(
  connection: Connection,
  accountId: BufferId,
): Promise<LockAccount[]> {
  const accounts = await connection.query(lockAccounts(accountId));
  return accounts.map((account) =>
    createLockAccountObject(connection, account),
  );
}

/**
 * Same as {@link getLockAccounts} but will only return those
 * lock accounts that currently have locked assets.
 * @param connection - the connection to use when calling the blockchain
 * @param accountId - the id of the account for which to fetch lock accounts
 * @returns a list of lock accounts. The list will be empty in case of no lock accounts with non zero balances
 */
export async function getLockAccountsWithNonZeroBalances(
  connection: Connection,
  accountId: BufferId,
): Promise<LockAccount[]> {
  const accounts = await connection.query(
    lockAccountsWithNonZeroBalances(accountId),
  );
  return accounts.map((account) =>
    createLockAccountObject(connection, account),
  );
}

/**
 * Fetches balances of a certain asset and, optionally, types which has been
 * locked for a specified account as a paginated entity.
 * @param queryable - the client to use to query the blockchain
 * @param accountId - id of the account for which to fetch locked assets
 * @param assetId - id of the asset to fetch locked balances for
 * @param types - optionally limit the result to specific types of locked assets
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export async function getLockedAssetBalance(
  queryable: Queryable,
  accountId: BufferId,
  assetId: BufferId,
  types: string[] | null = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<LockedAmount>> {
  const asset = await getAssetById(queryable, assetId);
  if (asset === null) {
    throw new Error(`Asset <${assetId}> does not exist`);
  }

  return retrievePaginatedEntity<LockedAmount, LockedAmountResponse>(
    queryable,
    lockedAssetBalance(accountId, assetId, types, limit, cursor),
    (balances) =>
      balances.map((balance) =>
        createLockedAssetBalanceObject(balance, asset.decimals),
      ),
  );
}

/**
 * Fetches the locked balances of a certain asset on a certain account and
 * aggregates them all to a total amount.
 * @param queryable - client to use to query the blockchain
 * @param accountId - the id of the account to fetch balances for
 * @param assetId - the id of the asset for which to fetch balances
 * @param types - optionally limit the balances to a specific type
 * @throws Throws an error if the specified asset does not exist
 */
export async function getLockedAssetAggregatedBalance(
  queryable: Queryable,
  accountId: BufferId,
  assetId: BufferId,
  types: string[] | null = null,
): Promise<Amount> {
  const asset = await getAssetById(queryable, assetId);
  if (asset === null) {
    throw new Error(`Asset <${assetId}> does not exist`);
  }
  const balance = await queryable.query(
    lockedAssetAggregatedBalance(accountId, assetId, types),
  );
  return createAmountFromBalance(balance, asset.decimals);
}

/**
 * Fetches all locked asset balances for the specified account as a paginated
 * entity. Optionally limited by specific types
 * @param queryable - client to use to query the blockchain
 * @param accountId - the id of the account to fetch balances for
 * @param types - optionally limit the balances to a specific type
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export function getLockedAssetBalances(
  queryable: Queryable,
  accountId: BufferId,
  types: string[] | null = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<LockedBalance>> {
  return retrievePaginatedEntity<LockedBalance, LockedBalanceResponse>(
    queryable,
    lockedAssetBalances(accountId, types, limit, cursor),
    (balances) => balances.map(createLockedBalanceObject),
  );
}

/**
 * Same as {@link getLockedAssetAggregatedBalance} but it returns
 * aggregated balances for all asset types instead of a specific one.
 * @param queryable - client to use to query the blockchain
 * @param accountId - the id of the account to fetch balances for
 * @param types - optionally limit the balances to a specific type
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export function getLockedAssetAggregatedBalances(
  queryable: Queryable,
  accountId: BufferId,
  types: string[] | null = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<LockedAggregatedBalance>> {
  return retrievePaginatedEntity<
    LockedAggregatedBalance,
    LockedAggregatedBalanceResponse
  >(
    queryable,
    lockedAssetAggregatedBalances(accountId, types, limit, cursor),
    (balances) => balances.map(createLockedAggregatedBalanceObject),
  );
}

export function createLockAccountObject(
  connection: Connection,
  account: LockAccountResponse,
): LockAccount {
  return {
    type: account.type,
    account: createAccountObject(connection, account.id),
  };
}

export function createLockedAssetBalanceObject(
  balance: LockedAmountResponse,
  decimals: number,
): LockedAmount {
  return Object.freeze({
    type: balance.type,
    amount: createAmountFromBalance(balance.amount, decimals),
  });
}

export function createLockedAggregatedBalanceObject(
  balance: LockedAggregatedBalanceResponse,
): LockedAggregatedBalance {
  return Object.freeze({
    asset: createAssetObject(balance.asset),
    amount: createAmountFromBalance(balance.amount, balance.asset.decimals),
  });
}

export function createLockedBalanceObject(
  balance: LockedBalanceResponse,
): LockedBalance {
  return Object.freeze({
    type: balance.type,
    asset: createAssetObject(balance.asset),
    amount: createAmountFromBalance(balance.amount, balance.asset.decimals),
  });
}

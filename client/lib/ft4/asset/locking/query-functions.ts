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

export async function getLockAccounts(
  connection: Connection,
  accountId: BufferId,
): Promise<LockAccount[]> {
  const accounts = await connection.query(lockAccounts(accountId));
  return accounts.map((account) =>
    createLockAccountObject(connection, account),
  );
}

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

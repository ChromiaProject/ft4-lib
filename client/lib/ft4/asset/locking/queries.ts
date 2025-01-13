import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { PaginatedEntity } from "@ft4/utils";
import { BufferId, QueryObject, formatter } from "postchain-client";
import {
  LockedBalanceResponse,
  LockedAmountResponse,
  LockedAggregatedBalanceResponse,
  LockAccountResponse,
} from "./types";

export function lockAccounts(
  accountId: BufferId,
): QueryObject<LockAccountResponse[], { account_id: Buffer }> {
  return {
    name: "ft4.get_lock_accounts",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

export function lockAccountsWithNonZeroBalances(
  accountId: BufferId,
): QueryObject<LockAccountResponse[], { account_id: Buffer }> {
  return {
    name: "ft4.get_lock_accounts_with_non_zero_balances",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

export function lockedAssetBalance(
  accountId: BufferId,
  assetId: BufferId,
  types: string[] | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<LockedAmountResponse>,
  {
    account_id: Buffer;
    asset_id: Buffer;
    types: string[] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_locked_asset_balance",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      asset_id: formatter.ensureBuffer(assetId),
      types,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function lockedAssetAggregatedBalance(
  accountId: BufferId,
  assetId: BufferId,
  types: string[] | null,
): QueryObject<
  bigint,
  {
    account_id: Buffer;
    asset_id: Buffer;
    types: string[] | null;
  }
> {
  return {
    name: "ft4.get_locked_asset_aggregated_balance",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      asset_id: formatter.ensureBuffer(assetId),
      types,
    },
  };
}

export function lockedAssetBalances(
  accountId: BufferId,
  types: string[] | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<LockedBalanceResponse>,
  {
    account_id: Buffer;
    types: string[] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_locked_asset_balances",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      types,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function lockedAssetAggregatedBalances(
  accountId: BufferId,
  types: string[] | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<LockedAggregatedBalanceResponse>,
  {
    account_id: Buffer;
    types: string[] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_locked_asset_aggregated_balances",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      types,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

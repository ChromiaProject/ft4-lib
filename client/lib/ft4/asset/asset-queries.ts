import { QueryObject, formatter } from "postchain-client";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { Buffer } from "buffer";
import { AssetResponse, BalanceResponse } from "./types";
import { BufferId, PaginatedEntity } from "@ft4/utils";

export function assetById(
  assetId: BufferId,
): QueryObject<AssetResponse, { asset_id: Buffer }> {
  return {
    name: "ft4.get_asset_by_id",
    args: {
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function assetBySymbol(
  symbol: string,
): QueryObject<AssetResponse, { symbol: string }> {
  return {
    name: "ft4.get_asset_by_symbol",
    args: { symbol },
  };
}

export function assetsByName(
  name: string,
  limit: OptionalLimit,
  cursor: OptionalPageCursor = null,
): QueryObject<
  AssetResponse,
  {
    name: string;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_assets_by_name",
    args: {
      name: name,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function assetsByType(
  type: string,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AssetResponse>,
  { type: string; page_size: OptionalLimit; page_cursor: OptionalPageCursor }
> {
  return {
    name: "ft4.get_assets_by_type",
    args: {
      type: type,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function allAssets(
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AssetResponse>,
  { page_size: OptionalLimit; page_cursor: OptionalPageCursor }
> {
  return {
    name: "ft4.get_all_assets",
    args: {
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function balanceByAccountId(
  accountId: BufferId,
  assetId: BufferId,
): QueryObject<BalanceResponse, { account_id: Buffer; asset_id: Buffer }> {
  return {
    name: "ft4.get_asset_balance",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function balancesByAccountId(
  accountId: BufferId,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): QueryObject<
  PaginatedEntity<BalanceResponse>,
  {
    account_id: Buffer;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_asset_balances",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

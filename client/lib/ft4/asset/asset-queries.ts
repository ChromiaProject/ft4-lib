import { QueryObject, formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { Query } from "../utils/types";
import { OptionalPageCursor } from "../types";
import { Buffer } from "buffer";

export function balancesByAccountIdQuery(accountId: BufferId): Query {
  return [
    "ft4._get_asset_balances",
    { account_id: formatter.ensureBuffer(accountId) },
  ];
}

export function balanceQuery(accountId: Buffer, assetId: Buffer): Query {
  return [
    "ft4.get_asset_balance",
    {
      account_id: accountId,
      asset_id: assetId,
    },
  ];
}

export function assetById(
  assetId: BufferId
): QueryObject<{ asset_id: Buffer }> {
  return {
    name: "ft4.get_asset_by_id",
    args: {
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function assetBySymbol(symbol: string): QueryObject<{ symbol: string }> {
  return {
    name: "ft4.get_asset_by_symbol",
    args: { symbol },
  };
}

export function assetsByName(
  name: string,
  limit: number,
  cursor: OptionalPageCursor = null
): QueryObject<{
  name: string;
  page_size: number;
  page_cursor: OptionalPageCursor;
}> {
  return {
    name: "ft4.get_assets_by_name",
    args: {
      name: name,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function allAssets(
  limit: number,
  cursor: OptionalPageCursor
): QueryObject<{ page_size: number; page_cursor: OptionalPageCursor }> {
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
  assetId: BufferId
): QueryObject<{ account_id: Buffer; asset_id: Buffer }> {
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
  limit = 100,
  cursor: OptionalPageCursor = null
): QueryObject<{
  account_id: Buffer;
  page_size: number;
  page_cursor: OptionalPageCursor;
}> {
  return {
    name: "ft4.get_asset_balances",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

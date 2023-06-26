import { formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { QueryObject, Query } from "../utils/types";
import { OptionalPageCursor } from "../types";
import { Buffer } from "buffer";

export function assetByIdQuery(assetId: Buffer): Query {
  return ["ft4.get_asset_by_id", { asset_id: assetId }];
}

export function balancesByAccountIdQuery(accountId: BufferId): Query {
  return [
    "ft4.get_asset_balances",
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

export function assetByNameQuery(name: string): Query {
  return ["ft4.get_asset_by_name", { name: name }];
}

export function allAssetsQuery(): Query {
  return ["ft4.get_all_assets", undefined];
}

export function assetById(assetId: BufferId): QueryObject {
  return {
    name: "ft4.get_asset_by_id",
    args: {
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function assetByName(name: string): QueryObject {
  return {
    name: "ft4.get_asset_by_name",
    args: {
      name: name,
    },
  };
}

export function allAssets(): QueryObject {
  return {
    name: "ft4.get_all_assets",
    args: {},
  };
}

export function balanceByAccountId(
  accountId: BufferId,
  assetId: BufferId
): QueryObject {
  return {
    name: "ft4.get_asset_balance",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function balancesByAccountId(accountId: BufferId): QueryObject {
  return {
    name: "ft4.get_asset_balances",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

export function balancesByAccountIdPaginated(
  accountId: BufferId,
  limit = 100,
  cursor: OptionalPageCursor = null
): QueryObject {
  return {
    name: "ft4.get_asset_balances_paginated",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

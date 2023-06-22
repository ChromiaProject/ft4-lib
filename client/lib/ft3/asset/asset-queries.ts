import { QueryObject, formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { Query } from "../utils/types";

export function assetByIdQuery(assetId: Buffer): Query {
  return ["ft4.get_asset_by_id", { asset_id: assetId }];
}

export function balancesByAccountIdQuery(accountId: Buffer): Query {
  return ["ft4.get_asset_balances", { account_id: accountId }];
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

export function assetByName(name: string): QueryObject<{ name: string }> {
  return {
    name: "ft4.get_asset_by_name",
    args: {
      name: name,
    },
  };
}

export function allAssets(): QueryObject<undefined> {
  return {
    name: "ft4.get_all_assets",
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
  accountId: BufferId
): QueryObject<{ account_id: Buffer }> {
  return {
    name: "ft4.get_asset_balances",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

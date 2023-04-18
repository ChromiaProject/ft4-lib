import { Query } from "../utils/types";

export function assetByIdQuery(assetId: Buffer): Query {
  return ["ft3.get_asset_by_id", { asset_id: assetId }];
}

export function balancesByAccountIdQuery(accountId: Buffer): Query {
  return ["ft3.get_asset_balances", { account_id: accountId }];
}

export function balanceQuery(accountId: Buffer, assetId: Buffer): Query {
  return [
    "ft3.get_asset_balance",
    {
      account_id: accountId,
      asset_id: assetId,
    },
  ];
}

export function assetByNameQuery(name: string): Query {
  return ["ft3.get_asset_by_name", { name: name }];
}

export function allAssetsQuery(): Query {
  return ["ft3.get_all_assets", undefined];
}

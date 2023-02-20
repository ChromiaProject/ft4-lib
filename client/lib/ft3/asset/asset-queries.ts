import { QueryObject } from "postchain-client/built/src/restclient/types";

export function assetByIdQuery(assetId: Buffer): QueryObject {
  return { type: "ft3.get_asset_by_id", asset_id: assetId };
}

export function balancesByAccountIdQuery(accountId: Buffer): QueryObject {
  return { type: "ft3.get_asset_balances", account_id: accountId };
}

export function balanceQuery(accountId: Buffer, assetId: Buffer): QueryObject {
  return {
    type: "ft3.get_asset_balance",
    account_id: accountId,
    asset_id: assetId,
  };
}

export function assetByNameQuery(name: string): QueryObject {
  return { type: "ft3.get_asset_by_name", name: name };
}

export function allAssetsQuery(): QueryObject {
  return { type: "ft3.get_all_asset" };
}

import {
  balanceByAccountId,
  assetById,
  balancesByAccountId,
  allAssets,
  assetBySymbol,
  assetsByName,
} from "./asset-queries";
import { Asset, AssetResponse, Balance, BalanceResponse } from "./types";
import { Connection, OptionalPageCursor } from "../types";
import { BufferId, PaginatedEntity, freeze } from "@ft4/utils/types";
import { createAmountFromBalance } from "./amount";
import { retrievePaginatedEntity } from "@ft4/utils/entity-retriever";

export async function getAssetById(
  connection: Connection,
  id: BufferId,
): Promise<Asset | null> {
  const response = await connection.query(assetById(id));
  return response ? createAssetObject(response) : null;
}

export async function getAssetBySymbol(
  connection: Connection,
  symbol: string,
): Promise<Asset | null> {
  const response = await connection.query(assetBySymbol(symbol));
  return response ? createAssetObject(response) : null;
}

export function getAssetsByName(
  connection: Connection,
  name: string,
  limit = 100,
  cursor: OptionalPageCursor = null,
) {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    connection,
    assetsByName(name, limit, cursor),
    (a) => a.map(createAssetObject),
  );
}

export async function getAllAssets(
  connection: Connection,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    connection,
    allAssets(limit, cursor),
    (a) => a.map(createAssetObject),
  );
}

export async function getBalanceByAccountId(
  connection: Connection,
  accountId: BufferId,
  assetId: BufferId,
): Promise<Balance | null> {
  return await connection
    .query(balanceByAccountId(accountId, assetId))
    .then((res) => (res !== null ? createBalanceObject(res) : res));
}

export async function getBalancesByAccountId(
  connection: Connection,
  accountId: BufferId,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Balance>> {
  return retrievePaginatedEntity<Balance, BalanceResponse>(
    connection,
    balancesByAccountId(accountId, limit, cursor),
    (balances) => balances.map(createBalanceObject),
  );
}

export function createBalanceObject(balance: BalanceResponse): Balance {
  return freeze({
    asset: {
      id: balance.asset.id,
      name: balance.asset.name,
      symbol: balance.asset.symbol,
      decimals: balance.asset.decimals,
      brid: balance.asset.brid,
      supply: balance.asset.supply,
      iconUrl: balance.asset.icon_url,
    },
    amount: createAmountFromBalance(balance.amount, balance.asset.decimals),
  });
}

export function createAssetObject(asset: AssetResponse): Asset {
  return freeze({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    decimals: asset.decimals,
    brid: asset.brid,
    supply: asset.supply,
    iconUrl: asset.icon_url,
  });
}

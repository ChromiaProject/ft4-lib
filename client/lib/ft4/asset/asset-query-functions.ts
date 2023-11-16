import { BufferId } from "../cryptoUtils";
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
import { PaginatedEntity, freeze } from "../utils/types";
import { createAmountFromBalance } from "./amount";
import { createEntityRetriever } from "../utils/entity-retriever";

export async function getAssetById(
  connection: Connection,
  id: BufferId,
): Promise<Asset> {
  const response = await connection.query(assetById(id));
  return response ? createAssetObject(response) : null;
}

export async function getAssetBySymbol(
  connection: Connection,
  symbol: string,
): Promise<Asset> {
  const response = await connection.query(assetBySymbol(symbol));
  return response ? createAssetObject(response) : null;
}

export function getAssetsByName(
  connection: Connection,
  name: string,
  limit = 100,
  cursor: OptionalPageCursor = null,
) {
  const retriever = createEntityRetriever<Asset, AssetResponse>(
    connection,
    assetsByName(name, limit, cursor),
    (a) => a.map(createAssetObject),
  );
  return retriever.retrieve();
}

export async function getAllAssets(
  connection: Connection,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return createEntityRetriever<Asset, AssetResponse>(
    connection,
    allAssets(limit, cursor),
    (a) => a.map(createAssetObject),
  ).retrieve();
}

export async function getBalanceByAccountId(
  connection: Connection,
  accountId: BufferId,
  assetId: BufferId,
): Promise<Balance> {
  return await connection
    .query(balanceByAccountId(accountId, assetId))
    .then(createBalanceObject);
}

export async function getBalancesByAccountId(
  connection: Connection,
  accountId: BufferId,
): Promise<Balance[]> {
  const balances = await connection.query(balancesByAccountId(accountId));
  return balances.map(createBalanceObject);
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

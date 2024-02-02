import {
  balanceByAccountId,
  assetById,
  balancesByAccountId,
  allAssets,
  assetBySymbol,
  assetsByName,
} from "./asset-queries";
import { Asset, AssetResponse, Balance, BalanceResponse } from "./types";
import { Connection, OptionalLimit, OptionalPageCursor } from "@ft4/types";
import { BufferId, PaginatedEntity, retrievePaginatedEntity } from "@ft4/utils";
import { createAmountFromBalance } from "./amount";

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
  limit: OptionalLimit = null,
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
  limit: OptionalLimit = null,
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
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Balance>> {
  return retrievePaginatedEntity<Balance, BalanceResponse>(
    connection,
    balancesByAccountId(accountId, limit, cursor),
    (balances) => balances.map(createBalanceObject),
  );
}

export function createBalanceObject(balance: BalanceResponse): Balance {
  return Object.freeze({
    asset: {
      id: balance.asset.id,
      name: balance.asset.name,
      symbol: balance.asset.symbol,
      decimals: balance.asset.decimals,
      blockchainRid: balance.asset.blockchain_rid,
      supply: balance.asset.supply,
      iconUrl: balance.asset.icon_url,
    },
    amount: createAmountFromBalance(balance.amount, balance.asset.decimals),
  });
}

export function createAssetObject(asset: AssetResponse): Asset {
  return Object.freeze({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    decimals: asset.decimals,
    blockchainRid: asset.blockchain_rid,
    supply: asset.supply,
    iconUrl: asset.icon_url,
  });
}

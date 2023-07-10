import { BufferId } from "../../cryptoUtils";
import {
  balanceByAccountId,
  assetById,
  balancesByAccountId,
  allAssets,
  assetBySymbol,
  assetsByName,
} from "./asset-queries";
import { Asset, Balance, BalanceResponse } from "./types";
import { Connection, OptionalPageCursor } from "../types";
import { PaginatedEntity, freeze } from "../utils/types";
import { createAmountFromBalance } from "./amount";
import { createEntityRetriever } from "../utils/entity-retriever";

export async function getAssetById(
  connection: Connection,
  id: BufferId
): Promise<Asset> {
  return await connection.query<Asset>(assetById(id)).then(freeze);
}

export async function getAssetBySymbol(
  connection: Connection,
  symbol: string
): Promise<Asset> {
  return await connection.query<Asset>(assetBySymbol(symbol)).then(freeze);
}

export function getAssetsByName(
  connection: Connection,
  name: string,
  limit = 100,
  cursor: OptionalPageCursor = null
) {
  const retriever = createEntityRetriever<Asset, Asset>(
    connection,
    assetsByName(name, limit, cursor),
    (a) => a
  );
  return retriever.retrieve();
}

export async function getAllAssets(
  connection: Connection,
  limit = 100,
  cursor: OptionalPageCursor = null
): Promise<PaginatedEntity<Asset>> {
  return createEntityRetriever<Asset, Asset>(
    connection,
    allAssets(limit, cursor),
    (a) => a
  ).retrieve();
}

export async function getBalanceByAccountId(
  connection: Connection,
  accountId: BufferId,
  assetId: BufferId
): Promise<Balance> {
  return await connection
    .query<BalanceResponse>(balanceByAccountId(accountId, assetId))
    .then(createBalanceObject);
}

export async function getBalancesByAccountId(
  connection: Connection,
  accountId: BufferId
): Promise<Balance[]> {
  const balances = await connection.query<BalanceResponse[]>(
    balancesByAccountId(accountId)
  );
  return balances.map(createBalanceObject);
}

export function createBalanceObject(balance: BalanceResponse): Balance {
  return {
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
  };
}

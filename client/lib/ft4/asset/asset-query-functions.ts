import {
  balanceByAccountId,
  assetById,
  balancesByAccountId,
  allAssets,
  assetsBySymbol,
  assetsByName,
  assetsByType,
  assetDetailsForCrosschainRegistration,
} from "./asset-queries";
import {
  Asset,
  AssetResponse,
  Balance,
  BalanceResponse,
  CrosschainAssetRegistration,
  CrosschainAssetRegistrationResponse,
} from "./types";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { BufferId, PaginatedEntity, retrievePaginatedEntity } from "@ft4/utils";
import { createAmountFromBalance } from "./amount";
import { Queryable } from "postchain-client";

export async function getAssetById(
  queryable: Queryable,
  id: BufferId,
): Promise<Asset | null> {
  const response = await queryable.query(assetById(id));
  return response ? createAssetObject(response) : null;
}

export async function getAssetsBySymbol(
  queryable: Queryable,
  symbol: string,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    assetsBySymbol(symbol, limit, cursor),
    (assets) => assets.map(createAssetObject),
  );
}

export function getAssetsByName(
  queryable: Queryable,
  name: string,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    assetsByName(name, limit, cursor),
    (a) => a.map(createAssetObject),
  );
}

export async function getAssetsByType(
  queryable: Queryable,
  type: string,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    assetsByType(type, limit, cursor),
    (a) => a.map(createAssetObject),
  );
}

export async function getAllAssets(
  queryable: Queryable,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    allAssets(limit, cursor),
    (a) => a.map(createAssetObject),
  );
}

export function getAssetDetailsForCrosschainRegistration(
  queryable: Queryable,
  assetId: BufferId,
): Promise<CrosschainAssetRegistration> {
  return queryable
    .query(assetDetailsForCrosschainRegistration(assetId))
    .then(createCrosschainAssetRegistrationObject);
}

export async function getBalanceByAccountId(
  queryable: Queryable,
  accountId: BufferId,
  assetId: BufferId,
): Promise<Balance | null> {
  return await queryable
    .query(balanceByAccountId(accountId, assetId))
    .then((res) => (res !== null ? createBalanceObject(res) : res));
}

export async function getBalancesByAccountId(
  queryable: Queryable,
  accountId: BufferId,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Balance>> {
  return retrievePaginatedEntity<Balance, BalanceResponse>(
    queryable,
    balancesByAccountId(accountId, limit, cursor),
    (balances) => balances.map(createBalanceObject),
  );
}

export function createBalanceObject(balance: BalanceResponse): Balance {
  return Object.freeze({
    asset: createAssetObject(balance.asset),
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
    iconUrl: asset.icon_url,
    type: asset.type,
    supply: asset.supply,
  });
}

export function createCrosschainAssetRegistrationObject(
  asset: CrosschainAssetRegistrationResponse,
): CrosschainAssetRegistration {
  return Object.freeze({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    decimals: asset.decimals,
    blockchainRid: asset.blockchain_rid,
    iconUrl: asset.icon_url,
    type: asset.type,
    uniquenessResolver: asset.uniqueness_resolver,
  });
}

import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import {
  balancesByAccountIdQuery,
  assetByIdQuery,
  balanceQuery,
  assetByNameQuery,
  allAssetsQuery,
  balancesByAccountId,
  balanceByAccountId,
  assetById,
  assetByName,
  allAssets,
} from "./asset-queries";
import { Asset, Balance, BalanceResponse } from "./types";
import { formatter } from "postchain-client";
import { Connection } from "../interfaces";
import { freeze } from "../utils/types";
import { createAmount } from "./amount";

export async function getAssetById(
  session: GtxClient,
  id: BufferId
): Promise<Asset> {
  const asset = await session.query(
    ...assetByIdQuery(formatter.ensureBuffer(id))
  );

  return freeze(asset);
}

export async function getAllAssets(session: GtxClient): Promise<Asset[]> {
  return await session.query(...allAssetsQuery()).then(freeze);
}

export async function getAssetsByName(
  session: GtxClient,
  name: string
): Promise<Asset[]> {
  const assets = await session.query(...assetByNameQuery(name));
  return assets.map(freeze);
}

export async function getBalancesByAccountId(
  session: GtxClient,
  accountId: BufferId
): Promise<Balance[]> {
  const balances = await session.query(
    ...balancesByAccountIdQuery(formatter.ensureBuffer(accountId))
  );
  return balances.map(createBalanceObject);
}

export async function getBalance(
  session: GtxClient,
  accountId: BufferId,
  assetId: BufferId
): Promise<Balance> {
  const balance = await session.query(
    ...balanceQuery(
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(assetId)
    )
  );
  return createBalanceObject(balance);
}

export async function _getAssetById(
  connection: Connection,
  id: BufferId
): Promise<Asset> {
  return await connection.query<Asset>(assetById(id)).then(freeze);
}

export async function _getAssetsByName(
  connection: Connection,
  name: string
): Promise<Asset[]> {
  return await connection.query<Asset[]>(assetByName(name));
}

export async function _getAllAssets(connection: Connection): Promise<Asset[]> {
  return await connection.query<Asset[]>(allAssets());
}

export async function _getBalanceByAccountId(
  connection: Connection,
  accountId: BufferId,
  assetId: BufferId
): Promise<Balance> {
  return await connection
    .query<BalanceResponse>(balanceByAccountId(accountId, assetId))
    .then(createBalanceObject);
}

export async function _getBalancesByAccountId(
  connection: Connection,
  accountId: BufferId
): Promise<Balance[]> {
  return await connection
    .query<BalanceResponse[]>(balancesByAccountId(accountId))
    .then((balances) => balances.map(createBalanceObject));
}

function createBalanceObject(balance: BalanceResponse): Balance {
  return freeze({
    asset: balance.asset,
    amount: createAmount(balance.amount, balance.asset.decimals),
  });
}

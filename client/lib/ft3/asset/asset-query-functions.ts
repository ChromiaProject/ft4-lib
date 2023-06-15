import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import {
  balancesByAccountIdQuery,
  assetByIdQuery,
  balanceQuery,
  assetByNameQuery,
  allAssetsQuery,
  balanceByAccountId,
  assetById,
  assetByName,
  allAssets,
} from "./asset-queries";
import { Asset, Balance, BalanceResponse, BalanceResponseGtv } from "./types";
import { formatter } from "postchain-client";
import { Connection } from "../types";
import { EntityRetreiver, PaginatedEntity, freeze } from "../utils/types";
import { createAmountFromBalance } from "./amount";
import { createEntityRetriever } from "../utils/entity-retreiver";

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
  accountId: BufferId,
  amount: number
): Promise<{ items: Balance[]; retriever: EntityRetreiver<Balance[]> }> {
  const retriever = createEntityRetriever<
    Balance[],
    (BalanceResponse | BalanceResponseGtv)[]
  >(
    session,
    balancesByAccountIdQuery(formatter.ensureBuffer(accountId)),
    amount,
    (balances) => balances.map(createBalanceObject)
  );
  const items = await retriever.next();
  return { items, retriever };
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
): Promise<PaginatedEntity<Balance[]>> {
  const retriever = createEntityRetriever<Balance[]>(
    connection.client,
    balancesByAccountIdQuery(accountId),
    10,
    (balances) => balances.map(createBalanceObject)
  );
  const items = await retriever.next();
  return { items, retriever };
}

function createBalanceObject(
  balance: BalanceResponse | BalanceResponseGtv
): Balance {
  if (!Array.isArray(balance)) {
    return {
      asset: balance.asset,
      amount: createAmountFromBalance(balance.amount, balance.asset.decimals),
    };
  }

  return freeze({
    asset: {
      id: balance[0][0],
      name: balance[0][1],
      symbol: balance[0][2],
      decimals: balance[0][3],
      brid: balance[0][4],
      supply: balance[0][5],
      icon_url: balance[0][6],
    },
    amount: createAmountFromBalance(balance[1], balance[0][3]),
  });
}

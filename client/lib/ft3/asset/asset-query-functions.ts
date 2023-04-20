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
} from "./asset-queries";
import { Asset, Balance } from "./types";
import { formatter } from "postchain-client";
import { Connection } from "../interfaces";

export async function getAssetById(
  session: GtxClient,
  id: BufferId
): Promise<Asset> {
  const asset = await session.query(
    ...assetByIdQuery(formatter.ensureBuffer(id))
  );
  return Object.freeze({
    name: asset.name,
    id: asset.id,
    brid: asset.issuing_brid,
  });
}

export async function getAllAssets(session: GtxClient): Promise<Asset[]> {
  const assets = await session.query(...allAssetsQuery());
  return assets.map(function (a): Asset {
    return Object.freeze({
      name: a.name,
      id: a.id,
      brid: a.issuing_brid,
    });
  });
}

export async function getAssetsByName(
  session: GtxClient,
  name: string
): Promise<Asset[]> {
  const assets = await session.query(...assetByNameQuery(name));
  return assets.map(function (a): Asset {
    return Object.freeze({
      name: a.name,
      id: a.id,
      brid: a.issuing_brid,
    });
  });
}

export async function getBalancesByAccountId(
  session: GtxClient,
  accountId: BufferId
): Promise<Balance[]> {
  const balances = await session.query(
    ...balancesByAccountIdQuery(formatter.ensureBuffer(accountId))
  );
  return balances.map(function (b): Balance {
    return Object.freeze({
      asset: { id: b.id, name: b.name, brid: b.brid },
      amount: b.amount,
    });
  });
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
  return Object.freeze({
    asset: { id: balance.id, name: balance.name, brid: balance.brid },
    amount: balance.amount,
  });
}

export async function _getBalanceByAccountId(
  connection: Connection,
  accountId: BufferId,
  assetId: BufferId
): Promise<Balance> {
  return await connection.query<Balance>(
    balanceByAccountId(accountId, assetId)
  );
}

export async function _getBalancesByAccountId(
  connection: Connection,
  accountId: BufferId
): Promise<Balance[]> {
  return await connection.query<Balance[]>(balancesByAccountId(accountId));
}

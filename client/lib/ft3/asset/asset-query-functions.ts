import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import {
  balancesByAccountIdQuery,
  assetByIdQuery,
  balanceQuery,
  assetByNameQuery,
  allAssetsQuery,
} from "./asset-queries";
import { Asset, Balance } from "./types";

export async function getAssetById(
  id: Buffer,
  session: GtxClient
): Promise<Asset> {
  const asset = await session.query(assetByIdQuery(id));
  return {
    name: asset.name,
    id: asset.id,
    brid: asset.issuing_brid,
  };
}

export async function getAllAssets(session: GtxClient): Promise<Asset[]> {
  const assets = await session.query(allAssetsQuery());
  return assets.map(function (a): Asset {
    return {
      name: a.name,
      id: a.id,
      brid: a.issuing_brid,
    };
  });
}

export async function getAssetsByName(
  name: string,
  session: GtxClient
): Promise<Asset[]> {
  const assets = await session.query(assetByNameQuery(name));
  return assets.map(function (a): Asset {
    return {
      name: a.name,
      id: a.id,
      brid: a.issuing_brid,
    };
  });
}

export async function getBalancesByAccountId(
  accountId: Buffer,
  session: GtxClient
): Promise<Balance[]> {
  const balances = await session.query(balancesByAccountIdQuery(accountId));
  return balances.map(function (b): Balance {
    return {
      asset: { id: b.id, name: b.name, brid: b.brid },
      amount: b.amount,
    };
  });
}

export async function getBalance(
  accountId: Buffer,
  assetId: Buffer,
  session: GtxClient
): Promise<Balance> {
  const balance = await session.query(balanceQuery(accountId, assetId));
  return {
    asset: { id: balance.id, name: balance.name, brid: balance.brid },
    amount: balance.amount,
  };
}

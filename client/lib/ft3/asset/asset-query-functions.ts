import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import {
  balancesByAccountIdQuery,
  assetByIdQuery,
  balanceQuery,
  assetByNameQuery,
  allAssetsQuery,
} from "./asset-queries";
import { Asset, Balance } from "./types";
import { formatter } from "postchain-client";

export async function getAssetById(
  id: BufferId,
  session: GtxClient
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
  name: string,
  session: GtxClient
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
  accountId: BufferId,
  session: GtxClient
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
  accountId: BufferId,
  assetId: BufferId,
  session: GtxClient
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

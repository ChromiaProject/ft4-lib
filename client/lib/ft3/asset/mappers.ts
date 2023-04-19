import { Asset, Balance } from "./types";

export function mapBalance(balance: any): Balance {
  const { id, name, brid, amount } = balance;
  return Object.freeze({
    asset: { id, name, brid },
    amount,
  });
}

export function mapBalances(balances: any): Balance[] {
  return balances.map(mapBalance);
}

export function mapAsset(asset: any): Asset {
  return Object.freeze({
    name: asset.name,
    id: asset.id,
    brid: asset.issuing_brid,
  });
}

export function mapAssets(assets: any): Asset[] {
  return assets.map(mapAsset);
}

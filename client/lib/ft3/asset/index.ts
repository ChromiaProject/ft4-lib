import { gtvHash } from "postchain-client/built/src/gtv";
import {
  getAllAssets,
  getAssetById,
  getAssetsByName,
  getBalance,
  getBalancesByAccountId,
} from "./asset-query-functions";
import { giveBalance, registerAsset } from "./asset-op-functions";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { User } from "../account/types";
import { AssetAmount } from "./types";

export function id(assetName: string, assetBrid: Buffer) {
  return gtvHash([assetName, assetBrid]);
}

export const assetQuerySession = (pci: GtxClient) => ({
  asset: {
    by: {
      name: (name: string) => getAssetsByName(name, pci),
      id: (assetId: Buffer) => getAssetById(assetId, pci),
    },
    all: () => getAllAssets(pci),
  },
  balance: {
    by: {
      accountId: (accountId: Buffer) => getBalancesByAccountId(accountId, pci),
      accountAndAssetId: (accountId: Buffer, assetId: Buffer) =>
        getBalance(accountId, assetId, pci),
    },
  },
});

export const assetUserSession = (user: User, pci: GtxClient) => ({
  asset: {
    dev: {
      register: (name: string, brid: Buffer) =>
        registerAsset(name, brid, user, pci),
    },
  },
  balance: {
    dev: {
      give: (assetId: Buffer, accountId: Buffer, amount: AssetAmount) =>
        giveBalance(assetId, accountId, amount, user, pci),
    },
  },
});

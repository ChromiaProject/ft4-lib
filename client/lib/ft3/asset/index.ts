import {
  getAllAssets,
  getAssetById,
  getAssetsByName,
  getBalance,
  getBalancesByAccountId,
} from "./asset-query-functions";
import { mint, registerAsset } from "./asset-op-functions";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { User } from "../account/types";
import { Amount } from "./interfaces";
import { BufferId } from "../../cryptoUtils";
import { formatter, gtv } from "postchain-client";

export function id(assetName: string, assetBrid: BufferId) {
  return gtv.gtvHash([assetName, formatter.ensureBuffer(assetBrid)]);
}

export const assetQuerySession = (pci: GtxClient) =>
  Object.freeze({
    asset: {
      id,
      by: {
        name: (name: string) => getAssetsByName(pci, name),
        id: (assetId: BufferId) => getAssetById(pci, assetId),
      },
      all: () => getAllAssets(pci),
    },
    balance: {
      by: {
        accountId: (accountId: BufferId, amount: number) =>
          getBalancesByAccountId(pci, accountId, amount),
        accountAndAssetId: (accountId: BufferId, assetId: BufferId) =>
          getBalance(pci, accountId, assetId),
      },
    },
  });

export const assetUserSession = (user: User, pci: GtxClient) =>
  Object.freeze({
    asset: {
      admin: {
        register: (
          adminUser: User,
          name: string,
          symbol: string,
          decimals: number,
          iconUrl: string
        ) =>
          registerAsset(user, adminUser, pci, name, symbol, decimals, iconUrl),
      },
    },
    balance: {
      admin: {
        mint: (
          adminUser: User,
          accountId: BufferId,
          assetId: BufferId,
          amount: Amount
        ) => mint(user, adminUser, pci, accountId, assetId, amount),
      },
    },
  });

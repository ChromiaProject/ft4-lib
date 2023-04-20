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
        accountId: (accountId: BufferId) =>
          getBalancesByAccountId(pci, accountId),
        accountAndAssetId: (accountId: BufferId, assetId: BufferId) =>
          getBalance(pci, accountId, assetId),
      },
    },
  });

export const assetUserSession = (user: User, pci: GtxClient) =>
  Object.freeze({
    asset: {
      admin: {
        register: (adminUser: User, name: string, brid: BufferId) =>
          registerAsset(user, adminUser, pci, name, brid),
      },
    },
    balance: {
      admin: {
        give: (
          adminUser: User,
          assetId: BufferId,
          accountId: BufferId,
          amount: AssetAmount
        ) => giveBalance(user, adminUser, pci, assetId, accountId, amount),
      },
    },
  });

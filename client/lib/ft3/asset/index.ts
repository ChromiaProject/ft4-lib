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
import { transactionBuilder } from "../utils/transaction-builder";

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
      dev: {
        register: (name: string, brid: BufferId) =>
          registerAsset(name, brid, transactionBuilder(user, pci)),
      },
    },
    balance: {
      dev: {
        give: (assetId: BufferId, accountId: BufferId, amount: AssetAmount) =>
          giveBalance(
            assetId,
            accountId,
            amount,
            transactionBuilder(user, pci)
          ),
      },
    },
  });

import { getBalance, getBalancesByAccountId } from "./asset-query-functions";
import { mint, registerAsset } from "./asset-op-functions";
import { User } from "../accounts/types";
import { Amount } from "./interfaces";
import { BufferId } from "../../cryptoUtils";
import { formatter, gtv, GtxClient } from "postchain-client";

export function id(assetName: string, assetBrid: BufferId) {
  return gtv.gtvHash([assetName, formatter.ensureBuffer(assetBrid)]);
}

export const assetQuerySession = (pci: GtxClient) =>
  Object.freeze({
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

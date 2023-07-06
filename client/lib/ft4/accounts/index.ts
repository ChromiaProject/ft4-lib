import { GtxClient } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { legacyTransactionBuilder } from "../utils/transaction-builder-old";
import { transfer } from "./account-op-functions";
import { getByAuthDescriptorId, getById } from "./account-query-functions";
import { User } from "./types";
import { Amount } from "../asset/interfaces";

export * from "./auth";
export * from "./auth-descriptor";
export * from "./transfer-history";
export * from "./types";

export const accountQuerySession = (pci: GtxClient) =>
  Object.freeze({
    by: {
      authDescriptorId: (id: BufferId) => getByAuthDescriptorId(pci, id),
      id: (id: BufferId) => getById(pci, id),
    },
  });

export const accountUserSession = (user: User, pci: GtxClient) =>
  Object.freeze({
    token: {
      transfer: (
        from: BufferId,
        to: BufferId,
        asset: BufferId,
        amount: Amount
      ) =>
        transfer(from, to, asset, amount, legacyTransactionBuilder(user, pci)),
    },
  });

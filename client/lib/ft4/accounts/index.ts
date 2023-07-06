import { GtxClient } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { legacyTransactionBuilder } from "../utils/transaction-builder-old";
import {
  burnTokens,
  givePoints,
  registerAccount,
  transfer,
} from "./account-op-functions";
import {
  getByAuthDescriptorId,
  getById,
  getByIds,
  getByParticipantId,
  getRateLimit,
  isAuthDescriptorValid,
} from "./account-query-functions";
import { AuthDescriptor } from "./auth-descriptor/types";
import { User } from "./types";
import { deriveAccountId, toGtv } from "./auth-descriptor";
import { Amount } from "../asset/interfaces";

export * from "./auth";
export * from "./auth-descriptor";
export * from "./transfer-history";
export * from "./types";

export const accountQuerySession = (pci: GtxClient) =>
  Object.freeze({
    by: {
      participantId: (id: BufferId) => getByParticipantId(pci, id),
      authDescriptorId: (id: BufferId) => getByAuthDescriptorId(pci, id),
      ids: (ids: BufferId[]) => getByIds(pci, ids),
      id: (id: BufferId) => getById(pci, id),
    },
    isAuthDescriptorValid: (accountId: BufferId, authDescriptorId: BufferId) =>
      isAuthDescriptorValid(pci, accountId, authDescriptorId),
    rateLimit: (accountId: BufferId) => getRateLimit(pci, accountId),
    idFromAuthDescriptor: (firstAuthDescriptor: AuthDescriptor) =>
      deriveAccountId(toGtv(firstAuthDescriptor)),
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
      burn: (from: BufferId, asset: BufferId, amount: Amount) =>
        burnTokens(asset, amount, legacyTransactionBuilder(user, pci)),
    },
    admin: {
      register: (adminUser, authDescriptor: AuthDescriptor) =>
        registerAccount(user, adminUser, pci, authDescriptor),
      givePoints: (adminUser, accountId: BufferId, points: number) =>
        givePoints(user, adminUser, pci, accountId, points),
    },
  });

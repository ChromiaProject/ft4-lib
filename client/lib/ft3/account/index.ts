import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import {
  addAuthDescriptorToAccount,
  burnTokens,
  deleteAllAuthDescriptorsExclude,
  deleteAuthDescriptor,
  freeOperation,
  getPaymentHistoryIterator,
  givePoints,
  registerAccount,
  ssoRawTransactionAddAuthDescriptor,
  ssoRawTransactionRegister,
  transfer,
  xcTransfer,
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
import { ensurePaymentHistoryStoreLocal } from "./payment-history/payment-history-store-local";
import { createPaymentHistoryStoreMemory } from "./payment-history/payment-history-store-memory";
import { User } from "./types";
import { deriveAccountId } from "./auth-descriptor";

export const accountQuerySession = (pci: GtxClient) =>
  Object.freeze({
    by: {
      participantId: (id: BufferId) => getByParticipantId(pci, id),
      authDescriptorId: (id: BufferId) => getByAuthDescriptorId(pci, id),
      ids: (ids: BufferId[]) => getByIds(pci, ids),
      id: (id: BufferId) => getById(pci, id),
    },
    paymentHistory: {
      iterator: getPaymentHistoryIterator,
      storeMemory: (accountId: BufferId, pageSize: number) =>
        createPaymentHistoryStoreMemory(pci, accountId, pageSize),
      storeLocal: (accountId: BufferId, pageSize: number) =>
        ensurePaymentHistoryStoreLocal(pci, pageSize, accountId),
    },
    isAuthDescriptorValid: (accountId: BufferId, authDescriptorId: BufferId) =>
      isAuthDescriptorValid(pci, accountId, authDescriptorId),
    rateLimit: (accountId: BufferId) => getRateLimit(pci, accountId),
    idFromAuthDescriptor: (firstAuthDescriptor: AuthDescriptor) =>
      deriveAccountId(firstAuthDescriptor),
  });

export const accountUserSession = (user: User, pci: GtxClient) =>
  Object.freeze({
    sso: {
      ssoRegister: (authDescriptor: AuthDescriptor) =>
        ssoRawTransactionRegister(user, pci, authDescriptor),
      ssoAddAuthDescriptor: (
        accountId: BufferId,
        authDescriptor: AuthDescriptor
      ) =>
        ssoRawTransactionAddAuthDescriptor(
          user,
          pci,
          accountId,
          authDescriptor
        ),
    },
    authDescriptor: {
      add: (
        newUser: User,
        accountId: BufferId //add user? needs refactoring
      ) => addAuthDescriptorToAccount(user, pci, newUser, accountId),
      deleteAllExcluding: (authDescriptorId: BufferId, accountId: BufferId) =>
        deleteAllAuthDescriptorsExclude(user, pci, authDescriptorId, accountId),
      delete: (authDescriptorId: BufferId, accountId: BufferId) =>
        deleteAuthDescriptor(user, pci, authDescriptorId, accountId),
    },
    token: {
      transfer: (
        from: BufferId,
        to: BufferId,
        asset: BufferId,
        amount: bigint
      ) => transfer(user, pci, from, to, asset, amount),
      burn: (from: BufferId, asset: BufferId, amount: bigint) =>
        burnTokens(user, pci, from, asset, amount),
      xcTransfer: () => xcTransfer(user, pci),
    },
    admin: {
      register: (adminUser, authDescriptor: AuthDescriptor) =>
        registerAccount(user, adminUser, pci, authDescriptor),
      freeOperation: (adminUser, accountId: BufferId) =>
        freeOperation(user, adminUser, pci, accountId),
      givePoints: (adminUser, accountId: BufferId, points: number) =>
        givePoints(user, adminUser, pci, accountId, points),
    },
  });

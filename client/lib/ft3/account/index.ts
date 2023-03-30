import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import {
  addAuthDescriptorToAcc,
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
} from "./account-op-functions";
import {
  getByAuthDescriptorId,
  getById,
  getByIds,
  getByParticipantId,
  isAuthDescriptorValid,
} from "./account-query-functions";
import { AuthDescriptor } from "./auth-descriptor/types";
import { ensurePaymentHistoryStoreLocal } from "./payment-history/payment-history-store-local";
import { createPaymentHistoryStoreMemory } from "./payment-history/payment-history-store-memory";
import { User } from "./types";

export const accountQuerySession = (pci: GtxClient) =>
  Object.freeze({
    by: {
      participantId: (id: BufferId) => getByParticipantId(id, pci),
      authDescriptorId: (id: BufferId) => getByAuthDescriptorId(id, pci),
      ids: (ids: BufferId[]) => getByIds(ids, pci),
      id: (id: BufferId) => getById(id, pci),
    },
    paymentHistory: {
      iterator: getPaymentHistoryIterator,
      storeMemory: (accountId: BufferId, pageSize: number) =>
        createPaymentHistoryStoreMemory(accountId, pageSize, pci),
      storeLocal: (accountId: BufferId, pageSize: number) =>
        ensurePaymentHistoryStoreLocal(accountId, pageSize, pci),
    },
    isAuthDescriptorValid: (accountId: BufferId, authDescriptorId: BufferId) =>
      isAuthDescriptorValid(accountId, authDescriptorId, pci),
  });

export const accountUserSession = (user: User, pci: GtxClient) =>
  Object.freeze({
    sso: {
      ssoRegister: (authDescriptor: AuthDescriptor) =>
        ssoRawTransactionRegister(authDescriptor, user, pci),
      ssoAddAuthDescriptor: (
        accountId: BufferId,
        authDescriptor: AuthDescriptor
      ) =>
        ssoRawTransactionAddAuthDescriptor(
          accountId,
          authDescriptor,
          user,
          pci
        ),
    },
    authDescriptor: {
      add: (authDescriptor: AuthDescriptor, accountId: BufferId) =>
        addAuthDescriptorToAcc(authDescriptor, accountId, user, pci),
      deleteAllExcluding: (authDescriptorId: BufferId, accountId: BufferId) =>
        deleteAllAuthDescriptorsExclude(authDescriptorId, accountId, user, pci),
      delete: (authDescriptorId: BufferId, accountId: BufferId) =>
        deleteAuthDescriptor(authDescriptorId, accountId, user, pci),
    },
    token: {
      transfer: (
        from: BufferId,
        to: BufferId,
        asset: BufferId,
        amount: bigint
      ) => transfer(from, to, asset, amount, user, pci),
      burn: (from: BufferId, asset: BufferId, amount: bigint) =>
        burnTokens(from, asset, amount, user, pci),
      //xcTransfer: () => xcTransfer(user, pci),
    },
    dev: {
      register: (authDescriptor: AuthDescriptor) =>
        registerAccount(authDescriptor, user, pci),
      freeOperation: (accountId: BufferId) =>
        freeOperation(accountId, user, pci),
      givePoints: (accountId: BufferId, points: number) =>
        givePoints(accountId, points, user, pci),
    },
  });

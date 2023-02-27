import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import {
  addAuthDescriptorToAcc,
  burnTokens,
  deleteAllAuthDescriptorsExclude,
  deleteAuthDescriptor,
  freeOperation,
  getPaymentHistoryIterator,
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
      participantId: (id: Buffer) => getByParticipantId(id, pci),
      authDescriptorId: (id: Buffer) => getByAuthDescriptorId(id, pci),
      ids: (ids: Buffer[]) => getByIds(ids, pci),
      id: (id: Buffer) => getById(id, pci),
    },
    paymentHistory: {
      iterator: getPaymentHistoryIterator,
      storeMemory: (accountId: BufferId, pageSize: number) =>
        createPaymentHistoryStoreMemory(accountId, pageSize, pci),
      storeLocal: (accountId: BufferId, pageSize: number) =>
        ensurePaymentHistoryStoreLocal(accountId, pageSize, pci),
    },
    isAuthDescriptorValid: (accountId: Buffer, authDescriptorId: Buffer) =>
      isAuthDescriptorValid(accountId, authDescriptorId, pci),
  });

export const accountUserSession = (user: User, pci: GtxClient) =>
  Object.freeze({
    sso: {
      ssoRegister: (authDescriptor: AuthDescriptor) =>
        ssoRawTransactionRegister(authDescriptor, user, pci),
      ssoAddAuthDescriptor: (
        accountId: Buffer,
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
      add: (authDescriptor: AuthDescriptor, accountId: Buffer) =>
        addAuthDescriptorToAcc(authDescriptor, accountId, user, pci),
      deleteAll: (authDescriptorId: Buffer, accountId: Buffer) =>
        deleteAllAuthDescriptorsExclude(authDescriptorId, accountId, user, pci),
      delete: (authDescriptorId: Buffer, accountId: Buffer) =>
        deleteAuthDescriptor(authDescriptorId, accountId, user, pci),
    },
    token: {
      transfer: (from: Buffer, to: Buffer, asset: Buffer, amount: bigint) =>
        transfer(from, to, asset, amount, user, pci),
      burn: (from: Buffer, asset: Buffer, amount: bigint) =>
        burnTokens(from, asset, amount, user, pci),
      //xcTransfer: () => xcTransfer(user, pci),
    },
    dev: {
      register: (authDescriptor: AuthDescriptor) =>
        registerAccount(authDescriptor, user, pci),
      freeOperation: (accountId: Buffer) => freeOperation(accountId, user, pci),
    },
  });

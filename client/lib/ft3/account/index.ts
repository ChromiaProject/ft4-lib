import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import { legacyTransactionBuilder } from "../utils/transaction-builder-old";
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
import { deriveAccountId, toGtv } from "./auth-descriptor";

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
      deriveAccountId(toGtv(firstAuthDescriptor)),
  });

export const accountUserSession = (user: User, pci: GtxClient) =>
  Object.freeze({
    sso: {
      ssoRegister: (authDescriptor: AuthDescriptor) =>
        ssoRawTransactionRegister(
          authDescriptor,
          user.authDescriptor,
          legacyTransactionBuilder(user, pci)
        ),
      ssoAddAuthDescriptor: (
        accountId: BufferId,
        authDescriptor: AuthDescriptor
      ) =>
        ssoRawTransactionAddAuthDescriptor(
          accountId,
          authDescriptor,
          legacyTransactionBuilder(user, pci)
        ),
    },
    authDescriptor: {
      add: (
        newUser: User,
        accountId: BufferId //add user? needs refactoring
      ) =>
        addAuthDescriptorToAccount(
          newUser,
          accountId,
          legacyTransactionBuilder(user, pci)
        ),
      deleteAllExcluding: (authDescriptorId: BufferId, accountId: BufferId) =>
        deleteAllAuthDescriptorsExclude(
          authDescriptorId,
          accountId,
          legacyTransactionBuilder(user, pci)
        ),
      delete: (authDescriptorId: BufferId, accountId: BufferId) =>
        deleteAuthDescriptor(
          authDescriptorId,
          accountId,
          legacyTransactionBuilder(user, pci)
        ),
    },
    token: {
      transfer: (
        from: BufferId,
        to: BufferId,
        asset: BufferId,
        amount: bigint
      ) =>
        transfer(from, to, asset, amount, legacyTransactionBuilder(user, pci)),
      burn: (from: BufferId, asset: BufferId, amount: bigint) =>
        burnTokens(from, asset, amount, legacyTransactionBuilder(user, pci)),
      xcTransfer: () => xcTransfer(),
    },
    dev: {
      register: (authDescriptor: AuthDescriptor) =>
        registerAccount(authDescriptor, legacyTransactionBuilder(user, pci)),
      freeOperation: (accountId: BufferId) =>
        freeOperation(accountId, legacyTransactionBuilder(user, pci)),
      givePoints: (accountId: BufferId, points: number) =>
        givePoints(accountId, points, legacyTransactionBuilder(user, pci)),
    },
  });

import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import {
  addAuthDescriptorToAcc,
  burnTokens,
  deleteAllAuthDescriptorsExclude,
  deleteAuthDescriptor,
  freeOperation,
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
  isAuthDescriptorValid,
} from "./account-query-functions";
import { AuthDescriptor } from "./auth-descriptor/types";
import { User } from "./types";

export const accountQuerySession = (pci: GtxClient) => ({
  by: {
    participantId: (id: Buffer) => getByParticipantId(id, pci),
    authDescriptorId: (id: Buffer) => getByAuthDescriptorId(id, pci),
    ids: (ids: Buffer[]) => getByIds(ids, pci),
    id: (id: Buffer) => getById(id, pci),
  },
  isAuthDescriptorValid: (accountId: Buffer, authDescriptorId: Buffer) =>
    isAuthDescriptorValid(accountId, authDescriptorId, pci),
});

export const accountUserSession = (user: User, pci: GtxClient) => ({
  sso: {
    ssoRegister: (authDescriptor: AuthDescriptor) =>
      ssoRawTransactionRegister(authDescriptor, user, pci),
    ssoAddAuthDescriptor: (accountId: Buffer, authDescriptor: AuthDescriptor) =>
      ssoRawTransactionAddAuthDescriptor(accountId, authDescriptor, user, pci),
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
    xcTransfer: () => xcTransfer(user, pci),
  },
  dev: {
    register: (authDescriptor: AuthDescriptor) =>
      registerAccount(authDescriptor, user, pci),
    freeOperation: (accountId: Buffer) => freeOperation(accountId, user, pci),
  },
});

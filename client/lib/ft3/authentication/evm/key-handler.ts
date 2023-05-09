import { BufferId } from "../../../cryptoUtils";
import { Operation } from "../../utils/types";
import { AuthData, KeyHandler, KeyStore } from "../interfaces";
import { AuthDescriptor } from "../../account/auth-descriptor/types";
import { Itransaction } from "postchain-client/built/src/gtx/interfaces";
import { EVMKeyStore, evmAuth } from ".";

export function createEVMKeyHandler(
  authDescriptor: AuthDescriptor,
  keyStore: EVMKeyStore
): KeyHandler {
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      satisfiesAuthRequirements(authDescriptor, requiredFlags),
    authenticate: (
      accountId: BufferId,
      operation: Operation,
      authData: AuthData
    ) =>
      authenticate(accountId, authDescriptor.id, operation, authData, keyStore),
    sign: (transaction: Itransaction) => sign(transaction, keyStore),
    getSigners: () => null,
  });
}

async function authenticate(
  accountId: BufferId,
  authDescriptorId: BufferId,
  operation: Operation,
  authData: AuthData,
  keyStore: EVMKeyStore
): Promise<Operation[]> {
  const signature = await keyStore.signMessage(authData.message);
  return [evmAuth(accountId, authDescriptorId, [signature]), operation];
}

/* eslint-disable */
async function sign(
  transaction: Itransaction,
  keyStore: KeyStore
): Promise<void> {
  // return transaction.sign(keyStore);
}
/* eslint-enable */

export function satisfiesAuthRequirements(
  authDescriptor: AuthDescriptor,
  requiredFlags: string[]
): boolean {
  return requiredFlags.every((flag) => authDescriptor.flags.has(flag));
}

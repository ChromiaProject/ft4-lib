import { BufferId } from "../../../cryptoUtils";
import { AuthData, KeyHandler, KeyStore } from "../interfaces";
import { AuthDescriptor } from "../../accounts/auth-descriptor/types";
import { EVMKeyStore, evmAuth } from ".";
import { formatter, Operation } from "postchain-client";
import { TxBuilderTransaction } from "/ft4/utils/types";

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
    sign: (transaction: TxBuilderTransaction) => sign(transaction, keyStore),
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
  const message = authData.message
    .replace("{account_id}", formatter.ensureBuffer(accountId).toString("hex"))
    .replace(
      "{auth_descriptor_id}",
      formatter.ensureBuffer(authDescriptorId).toString("hex")
    );
  const signature = await keyStore.signMessage(message);
  return [evmAuth(accountId, authDescriptorId, [signature]), operation];
}

/* eslint-disable */
async function sign(
  transaction: TxBuilderTransaction,
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

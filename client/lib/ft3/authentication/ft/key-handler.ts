import { formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { Operation } from "../../utils/types";
import { KeyHandler, KeyStore } from "../interfaces";
import { AuthDescriptor } from "../../account/auth-descriptor/types";
import { Itransaction } from "postchain-client/built/src/gtx/interfaces";

export function createFTKeyHandler(
  authDescriptor: AuthDescriptor,
  keyStore: KeyStore
): KeyHandler {
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      satisfiesAuthRequirements(authDescriptor, requiredFlags),
    authenticate: (accountId: BufferId, operation: Operation) =>
      authenticate(accountId, authDescriptor.id, operation),
    sign: (transaction: Itransaction) => sign(transaction, keyStore),
  });
}

async function authenticate(
  accountId: BufferId,
  authDescriptorId: BufferId,
  operation: Operation
): Promise<Operation[]> {
  return [ftAuth(accountId, authDescriptorId), operation];
}

export function ftAuth(
  accountId: BufferId,
  authDesriptorId: BufferId
): Operation {
  return [
    "ft_auth",
    [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDesriptorId),
    ],
  ];
}

async function sign(
  transaction: Itransaction,
  keyStore: KeyStore
): Promise<void> {
  return transaction.sign(keyStore);
}

export function satisfiesAuthRequirements(
  authDescriptor: AuthDescriptor,
  requiredFlags: string[]
): boolean {
  return requiredFlags.every((flag) => authDescriptor.flags.has(flag));
}

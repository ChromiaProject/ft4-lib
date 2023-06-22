import { BufferId } from "../../../cryptoUtils";
import { KeyHandler, KeyStore } from "../interfaces";
import { AuthDescriptor } from "../../account/auth-descriptor/types";
import { Transaction, Operation, SignatureProvider } from "postchain-client";
import { ftAuth } from ".";

export function createFTKeyHandler(
  authDescriptor: AuthDescriptor,
  keyStore: FTKeyStore
): KeyHandler {
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      satisfiesAuthRequirements(authDescriptor, requiredFlags),
    authenticate: (accountId: BufferId, operation: Operation) =>
      authenticate(accountId, authDescriptor.id, operation),
    sign: (transaction: Transaction) => sign(transaction, keyStore),
    getSigners: () => authDescriptor.signers,
  });
}

async function authenticate(
  accountId: BufferId,
  authDescriptorId: BufferId,
  operation: Operation
): Promise<Operation[]> {
  return [ftAuth(accountId, authDescriptorId), operation];
}

async function sign(
  transaction: Transaction,
  keyStore: FTKeyStore
): Promise<void> {
  return transaction.sign(keyStore);
}

export function satisfiesAuthRequirements(
  authDescriptor: AuthDescriptor,
  requiredFlags: string[]
): boolean {
  return requiredFlags.every((flag) => authDescriptor.flags.has(flag));
}

export interface FTKeyStore extends KeyStore, SignatureProvider {
  pubKey: Buffer;
}

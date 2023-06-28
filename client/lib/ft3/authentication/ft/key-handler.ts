import { BufferId } from "../../../cryptoUtils";
import { Operation } from "../../utils/types";
import { KeyHandler, KeyStore } from "../types";
import { AuthDescriptor } from "../../account/auth-descriptor/types";
import {
  Itransaction,
  SignatureProvider,
} from "postchain-client/built/src/gtx/interfaces";
import { Buffer } from "buffer";
import { ftAuth } from ".";

export function createFTKeyHandler(
  authDescriptor: AuthDescriptor,
  keyStore: FTKeyStore
): KeyHandler {
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      hasAuthDescriptorFlags(authDescriptor, requiredFlags),
    authenticate: (accountId: BufferId, operation: Operation) =>
      authenticate(accountId, authDescriptor.id, operation),
    sign: (transaction: Itransaction) => sign(transaction, keyStore),
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
  transaction: Itransaction,
  keyStore: FTKeyStore
): Promise<void> {
  return transaction.sign(keyStore);
}

export function hasAuthDescriptorFlags(
  authDescriptor: AuthDescriptor,
  requiredFlags: string[]
): boolean {
  return requiredFlags.every((flag) => authDescriptor.flags.has(flag));
}

export interface FTKeyStore extends KeyStore, SignatureProvider {
  pubKey: Buffer;
}

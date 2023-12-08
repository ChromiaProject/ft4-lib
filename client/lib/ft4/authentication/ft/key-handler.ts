import { Buffer } from "buffer";
import { Operation, SignatureProvider } from "postchain-client";
import { ftAuth } from ".";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  aggregateSigners,
  deriveAuthDescriptorId,
  gtv,
} from "/ft4/accounts/auth-descriptor";
import { BufferId, TxContext } from "/ft4/utils/types";

export function createFtKeyHandler(
  authDescriptor: AnyAuthDescriptor,
  keyStore: FtKeyStore,
): KeyHandler {
  const adId = deriveAuthDescriptorId(
    gtv.authDescriptorRegistrationToGtv(authDescriptor),
  );
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      hasAuthDescriptorFlags(authDescriptor, requiredFlags),
    authorize: (
      accountId: BufferId,
      operation: Operation,
      _context: TxContext,
      _authDataService: AuthDataService,
    ) => authorize(accountId, adId, operation),
    sign: (transaction: Buffer) => keyStore.sign(transaction), //sign(transaction, keyStore),
    getSigners: () => aggregateSigners(authDescriptor),
  });
}

async function authorize(
  accountId: BufferId,
  authDescriptorId: BufferId,
  operation: Operation,
): Promise<Operation[]> {
  return [ftAuth(accountId, authDescriptorId), operation];
}

export function hasAuthDescriptorFlags(
  authDescriptor: AnyAuthDescriptor | AnyAuthDescriptorRegistration,
  requiredFlags: string[],
): boolean {
  return requiredFlags.every((flag) =>
    authDescriptor.args.flags.includes(flag),
  );
}

export interface FtKeyStore extends KeyStore, SignatureProvider {
  pubKey: Buffer;
}

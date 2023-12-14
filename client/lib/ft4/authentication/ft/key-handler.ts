import { Operation } from "postchain-client";
import { FtKeyStore, ftAuth } from ".";
import { AuthDataService, KeyHandler } from "../types";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  aggregateSigners,
  deriveAuthDescriptorId,
  gtv,
} from "/ft4/accounts/auth-descriptor";
import { BufferId, TxBuilderTransaction, TxContext } from "/ft4/utils/types";

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
    sign: (transaction: TxBuilderTransaction) => keyStore.sign(transaction),
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

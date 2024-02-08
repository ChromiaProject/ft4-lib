import { Operation } from "postchain-client";
import { FtKeyStore, ftAuth } from ".";
import { AuthDataService, KeyHandler } from "..";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  aggregateSigners,
} from "@ft4/accounts";
import { BufferId, TxBuilderTransaction, TxContext } from "@ft4/utils";

export function createFtKeyHandler(
  authDescriptor: AnyAuthDescriptor,
  keyStore: FtKeyStore,
): KeyHandler {
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
    ) => authorize(accountId, authDescriptor.id, operation),
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

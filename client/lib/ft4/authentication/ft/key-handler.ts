import { AnyAuthDescriptor, aggregateSigners } from "@ft4/accounts";
import {
  AuthDataService,
  KeyHandler,
  hasAuthDescriptorFlags,
} from "@ft4/authentication";
import { BufferId, TxContext } from "@ft4/utils";
import { GTX, Operation } from "postchain-client";
import { FtKeyStore } from "./types";
import { ftAuth } from "./main";

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
    sign: (transaction: GTX) => keyStore.sign(transaction),
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

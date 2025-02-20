import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  createAccountObject,
  createAuthDescriptorValidatorWithTxContext,
} from "@ft4/accounts";
import { Connection } from "@ft4/ft-session";
import { TxContext, isRellOperation } from "@ft4/utils";
import {
  BufferId,
  Operation,
  RellOperation,
  formatter,
} from "postchain-client";
import { AuthDataService, Authenticator, KeyHandler, KeyStore } from "./types";
import { EVM_AUTH } from "./evm";
import { FT_AUTH } from "./ft";

/**
 * Checks if the provided auth descriptor has the specified flags.
 * @param authDescriptor - auth descriptor-like object to check flags for
 * @param requiredFlags - the flags to check for
 * @returns true if the specified auth descriptor has all the specified flags, else false.
 */
export function hasAuthDescriptorFlags(
  authDescriptor: AnyAuthDescriptor | AnyAuthDescriptorRegistration,
  requiredFlags: string[],
): boolean {
  return requiredFlags.every((flag) =>
    authDescriptor.args.flags.includes(flag),
  );
}

/**
 * Creates a new authenticator instance from the specified arguments
 * @param accountBufferId - the id of the account for which this authenticator is valid
 * @param keyHandlers - any key handlers that can be used to authenticate against this account
 * @param authDataService - an auth data service that will be used when interacting with the account
 */
export function createAuthenticator(
  accountBufferId: BufferId,
  keyHandlers: KeyHandler[],
  authDataService: AuthDataService,
): Authenticator {
  const accountId = formatter.ensureBuffer(accountBufferId);
  return Object.freeze({
    accountId,
    authDataService,
    keyHandlers,
    getKeyHandlerForOperation: (operation: Operation, txContext: TxContext) =>
      getKeyHandlerForOperation(
        authDataService,
        accountId,
        keyHandlers,
        operation,
        txContext,
      ),
    getAuthDescriptorCounter: (authDescriptorId: BufferId) =>
      authDataService.getAuthDescriptorCounter(accountId, authDescriptorId),
  });
}

async function getKeyHandlerForOperation(
  authDataService: AuthDataService,
  accountId: Buffer,
  keyHandlers: KeyHandler[],
  operation: Operation,
  txContext: TxContext,
): Promise<KeyHandler | null> {
  const authHandler = await authDataService.getAuthHandlerForOperation(
    operation.name,
  );
  if (!authHandler) return null;

  const allowedKeyHandlers = keyHandlers.filter((kh) =>
    kh.satisfiesAuthRequirements(authHandler.flags),
  );

  if (!allowedKeyHandlers.length) return null;

  const validHandlers = await filterOutInvalidAndExpiredHandlers(
    authDataService,
    allowedKeyHandlers,
    txContext,
  );

  const prioritizedKeyHandlers = validHandlers.toSorted(
    (kh1, kh2) => +kh1.keyStore.isInteractive - +kh2.keyStore.isInteractive,
  );

  if (!authHandler.dynamic) return prioritizedKeyHandlers[0];

  const selectedAdId = await authDataService.getAllowedAuthDescriptor(
    operation,
    accountId,
    prioritizedKeyHandlers.map((kh) => kh.authDescriptor.id),
  );
  if (!selectedAdId) return null;
  return (
    prioritizedKeyHandlers.find((kh) =>
      kh.authDescriptor.id.equals(selectedAdId),
    ) ?? null
  );
}

async function filterOutInvalidAndExpiredHandlers(
  authDataService: AuthDataService,
  handlers: KeyHandler[],
  txContext: TxContext,
): Promise<KeyHandler[]> {
  const validator = createAuthDescriptorValidatorWithTxContext(
    authDataService,
    txContext,
  );

  const validHandlers = await Promise.all(
    handlers.map(async (keyHandler) => {
      const active = await validator.isActive(keyHandler.authDescriptor);
      const expired = await validator.hasExpired(keyHandler.authDescriptor);
      return active && !expired;
    }),
  );
  return handlers.filter((_, index) => validHandlers[index]);
}

/**
 * Converts a list of keystores into a list of key handlers
 * @param connection - connection to the blockchain of interest
 * @param accountId - the id of the account of which the key handlers should be valid
 * @param keyStores - the key stores to convert to key handlers
 * @returns a list of ket handlers
 */
export async function getKeyHandlersForKeyStores(
  connection: Connection,
  accountId: Buffer,
  keyStores: KeyStore[],
): Promise<KeyHandler[]> {
  const account = createAccountObject(connection, accountId);

  let allKeyHandlers: KeyHandler[] = [];
  for (const keyStore of keyStores) {
    const response = await account.getAuthDescriptorsBySigner(keyStore.id);
    const keyHandlers = response.map((authDescriptor) =>
      keyStore.createKeyHandler(authDescriptor),
    );
    allKeyHandlers = [...allKeyHandlers, ...keyHandlers];
  }

  return allKeyHandlers;
}

/**
 * Checks if the specified operation is an auth operation
 * @param operation - the operation to check
 * @returns true if the operation was an auth operation, else false
 */
export function isAuthOperation(operation: Operation | RellOperation): boolean {
  const name = isRellOperation(operation) ? operation.opName : operation.name;
  return [EVM_AUTH, FT_AUTH].includes(name);
}

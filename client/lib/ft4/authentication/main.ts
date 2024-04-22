import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  createAccountObject,
  createAuthDescriptorValidatorWithTxContext,
} from "@ft4/accounts";
import { Connection } from "@ft4/ft-session";
import { BufferId, TxContext, isRellOperation } from "@ft4/utils";
import { Operation, RellOperation, formatter } from "postchain-client";
import { AuthDataService, Authenticator, KeyHandler, KeyStore } from "./types";
import { EVM_AUTH } from "./evm";
import { FT_AUTH } from "./ft";

export function hasAuthDescriptorFlags(
  authDescriptor: AnyAuthDescriptor | AnyAuthDescriptorRegistration,
  requiredFlags: string[],
): boolean {
  return requiredFlags.every((flag) =>
    authDescriptor.args.flags.includes(flag),
  );
}

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
    keyHandlers.find((kh) => kh.authDescriptor.id.equals(selectedAdId)) ?? null
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

export function isAuthOperation(operation: Operation | RellOperation): boolean {
  const name = isRellOperation(operation) ? operation.opName : operation.name;
  return [EVM_AUTH, FT_AUTH].includes(name);
}

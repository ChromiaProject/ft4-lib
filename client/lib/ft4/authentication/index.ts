import { Buffer } from "buffer";
import { Operation, formatter } from "postchain-client";
import { AuthDataService, Authenticator, KeyHandler, KeyStore } from "./types";
import { BufferId } from "@ft4/utils";
import { TxContext } from "@ft4/utils/types";
import { createAuthDescriptorValidatorWithTxContext } from "@ft4/accounts/auth-descriptor/validator";
import { Connection } from "@ft4/types";
import { createAccountObject } from "@ft4/accounts/account-query-functions";

export * from "./evm";
export * from "./ft";
export * from "./types";
export {
  LoginConfigRules,
  LoginConfigSimpleRule,
  LoginConfigComplexRule,
  mapLoginConfigRulesToAuthDescriptorRules,
  blockHeight,
  blockTime,
  relativeBlockHeight,
  relativeBlockTime,
  opCount,
  minutes,
  hours,
  days,
  weeks,
  ttlLoginRule,
} from "./login-manager/rules";

export {
  createSessionStorageLoginKeyStore,
  createLocalStorageLoginKeyStore,
} from "./login-manager/stores";

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
    getNonce: (authDescriptorId: BufferId) =>
      authDataService.getNonce(accountId, authDescriptorId),
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
    keyHandlers.find(
      (kh) => kh.authDescriptor.id.compare(selectedAdId) === 0,
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

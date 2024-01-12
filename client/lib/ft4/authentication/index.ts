import { Buffer } from "buffer";
import { Operation, formatter } from "postchain-client";
import { AuthDataService, Authenticator, KeyHandler, KeyStore } from "./types";
import { BufferId, TxBuilderTransaction, TxContext } from "@ft4/utils/types";
import {
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  AuthType,
  SingleSig,
  isActive,
  hasExpired,
} from "@ft4/accounts";

export * from "./evm";
export * from "./ft";
export * from "./types";

export {
  createSessionStorageLoginKeyStore,
  createLocalStorageLoginKeyStore,
} from "./login-manager/stores";

export function createAuthenticator(
  accountId: BufferId,
  keyHandlers: KeyHandler[],
  authDataService: AuthDataService,
): Authenticator {
  return Object.freeze({
    accountId: formatter.ensureBuffer(accountId),
    authDataService,
    keyHandlers,
    getKeyHandlerForOperation: (operation: Operation) =>
      getKeyHandlerForOperation(
        authDataService,
        accountId,
        keyHandlers,
        operation,
      ),
    getNonce: (authDescriptorId: BufferId) =>
      authDataService.getNonce(accountId, authDescriptorId),
  });
}

export function createNoopAuthenticator(
  authDataService: AuthDataService,
): Authenticator {
  return Object.freeze({
    accountId: Buffer.alloc(32),
    keyHandlers: [noopKeyHandler],
    authDataService,
    getKeyHandlerForOperation: (_operation: Operation) =>
      Promise.resolve(noopKeyHandler),
    getNonce: (_authDescriptorId: BufferId) => Promise.resolve(null),
  });
}

const nullKeyStore: KeyStore = Object.freeze({
  id: Buffer.alloc(32),
  isInteractive: false,
  sign: (tx: Buffer) => Promise.resolve(tx),
  createKeyHandler: (
    _authDescriptor: AnyAuthDescriptorRegistration | undefined,
  ) => noopKeyHandler,
});

const nullAuthDescriptor: AuthDescriptor<SingleSig> = Object.freeze({
  id: Buffer.from(""),
  authType: AuthType.SingleSig,
  args: {
    flags: [] as string[],
    signer: Buffer.alloc(32, 0),
  },
  rules: null,
  created: new Date(0),
});

const noopKeyHandler: KeyHandler = Object.freeze({
  authDescriptor: nullAuthDescriptor,
  keyStore: nullKeyStore,
  satisfiesAuthRequirements: (_flags: string[]) => true,
  authorize: (
    _accountId: BufferId,
    operation: Operation,
    _context: TxContext,
    _authDataService: AuthDataService,
  ) => Promise.resolve([operation]),
  sign: (_transaction: TxBuilderTransaction) =>
    Promise.resolve(Buffer.alloc(64)),
  getSigners: (): Buffer[] => [],
});

async function getAuthFlags(
  authDataService: AuthDataService,
  operation: Operation,
): Promise<string[]> {
  return await authDataService.getAuthFlags(operation);
}

async function getKeyHandlerForOperation(
  authDataService: AuthDataService,
  accountId: BufferId,
  keyHandlers: KeyHandler[],
  operation: Operation,
): Promise<KeyHandler | null> {
  const flags = await getAuthFlags(authDataService, operation);

  const handlers = keyHandlers.filter((keyHandler) =>
    keyHandler.satisfiesAuthRequirements(flags),
  );

  const nonInteractiveHandlers: KeyHandler[] = [];
  const interactiveHandlers: KeyHandler[] = [];
  handlers.forEach((keyHandler) => {
    (keyHandler.keyStore.isInteractive
      ? interactiveHandlers
      : nonInteractiveHandlers
    ).push(keyHandler);
  });

  const validNonInteractiveHandlers = await filterOutInvalidAndExpiredHandlers(
    authDataService,
    accountId,
    nonInteractiveHandlers,
  );

  if (validNonInteractiveHandlers.length !== 0) {
    return validNonInteractiveHandlers[0];
  }

  const validInteractiveHandlers = await filterOutInvalidAndExpiredHandlers(
    authDataService,
    accountId,
    interactiveHandlers,
  );

  if (validInteractiveHandlers.length !== 0) {
    return handlers[0];
  }

  return null;
}

async function filterOutInvalidAndExpiredHandlers(
  authDataService: AuthDataService,
  accountId: BufferId,
  handlers: KeyHandler[],
): Promise<KeyHandler[]> {
  let currentHeight = 0;
  const getBlockHeight = async () => {
    if (currentHeight === undefined) {
      const blocks = await authDataService.connection.client.getBlocksInfo(1);
      currentHeight = blocks[0].height;
    }
    return currentHeight;
  };
  const getNonce = async (authDescriptorId: BufferId) =>
    authDataService.getNonce(accountId, authDescriptorId);

  const validHandlers = await Promise.all(
    handlers.map(async (keyHandler) => {
      const active = await isActive(keyHandler.authDescriptor, getBlockHeight);
      const expired = await hasExpired(
        keyHandler.authDescriptor,
        getBlockHeight,
        getNonce,
      );
      return active && !expired;
    }),
  );
  return handlers.filter((_, index) => validHandlers[index]);
}

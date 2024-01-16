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
  accountBufferId: BufferId,
  keyHandlers: KeyHandler[],
  authDataService: AuthDataService,
): Authenticator {
  const accountId = formatter.ensureBuffer(accountBufferId);
  return Object.freeze({
    accountId,
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

async function getKeyHandlerForOperation(
  authDataService: AuthDataService,
  accountId: BufferId,
  keyHandlers: KeyHandler[],
  operation: Operation,
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
    accountId,
    allowedKeyHandlers,
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

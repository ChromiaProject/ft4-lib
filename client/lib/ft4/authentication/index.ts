import { Operation, formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import {
  AuthDataService,
  Authenticator,
  AuthenticatorSession,
  KeyHandler,
  KeyStore,
} from "./types";
import { TxBuilderTransaction } from "../utils/types";
import { Buffer } from "buffer";
import { AuthDescriptor } from "../accounts";

export * from "./evm";
export * from "./ft";
export * from "./types";

export function createAuthenticator(
  accountId: BufferId,
  keyHandlers: KeyHandler[],
  authDataService: AuthDataService,
): Authenticator {
  const authenticator = Object.freeze({
    accountId: formatter.ensureBuffer(accountId),
    authDataService,
    keyHandlers,
    createSession: () =>
      createAuthenticatorSession(authenticator, authDataService),
    getKeyHandlerForOperation: (operation: Operation) =>
      getKeyHandlerForOperation(authDataService, keyHandlers, operation),
    getNonce: (authDescriptorId: BufferId) =>
      authDataService.getNonce(accountId, authDescriptorId),
  });

  return authenticator;
}

export function createNoopAuthenticator(
  authDataService: AuthDataService,
): Authenticator {
  const authenticator = Object.freeze({
    accountId: Buffer.alloc(32),
    keyHandlers: [noopKeyHandler],
    authDataService,
    createSession: () =>
      createAuthenticatorSession(authenticator, authDataService),
    getKeyHandlerForOperation: (_operation: Operation) =>
      Promise.resolve(noopKeyHandler),
    getNonce: (_authDescriptorId: BufferId) => Promise.resolve(null),
  });

  return authenticator;
}

const nullKeyStore: KeyStore = Object.freeze({
  id: Buffer.alloc(32),
  isInteractive: false,
  createKeyHandler: (_authDescriptor: AuthDescriptor) => noopKeyHandler,
});

const nullAuthDescriptor: AuthDescriptor = Object.freeze({
  id: Buffer.alloc(0),
  authType: "S",
  flags: new Set<string>(),
  signaturesRequired: 0,
  signers: [],
  rule: null,
});

const noopKeyHandler: KeyHandler = Object.freeze({
  authDescriptor: nullAuthDescriptor,
  keyStore: nullKeyStore,
  satisfiesAuthRequirements: (_flags: string[]) => true,
  authorize: (
    _accountId: BufferId,
    operation: Operation,
    _nonce: number,
    _authDataService: AuthDataService,
  ) => Promise.resolve([operation]),
  sign: () => Promise.resolve(),
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
  keyHandlers: KeyHandler[],
  operation: Operation,
): Promise<KeyHandler | null> {
  const flags = await getAuthFlags(authDataService, operation);

  const handlers = keyHandlers.filter((keyHandler) =>
    keyHandler.satisfiesAuthRequirements(flags),
  );

  const nonInteractiveHandlers = handlers.filter(
    (keyHandler) => !keyHandler.keyStore.isInteractive,
  );

  if (nonInteractiveHandlers.length !== 0) {
    return nonInteractiveHandlers[0];
  }

  if (handlers.length !== 0) {
    return handlers[0];
  }

  return null;
}

function createAuthenticatorSession(
  authenticator: Authenticator,
  authDataService: AuthDataService,
): AuthenticatorSession {
  const usedKeyHandlers = new Set<KeyHandler>();

  return Object.freeze({
    authenticator,
    getUsedKeyHandlers: () => new Set(usedKeyHandlers),
    getSigners: () => {
      let signers = new Set<Buffer>();
      usedKeyHandlers.forEach(
        (keyHandler) =>
          (signers = new Set([
            ...keyHandler.authDescriptor.signers,
            ...signers,
          ])),
      );
      return signers;
    },
    authorize: async (operation: Operation) => {
      const keyHandler = await authenticator.getKeyHandlerForOperation(
        operation,
      );
      if (!keyHandler) {
        throw new Error(`Cannot authenticate operation: ${operation.name}`);
      }
      usedKeyHandlers.add(keyHandler);
      return await keyHandler.authorize(
        authenticator.accountId,
        operation,
        0,
        authDataService,
      );
    },
    sign: async (transaction: TxBuilderTransaction) => {
      await Promise.all(
        Array.from(usedKeyHandlers).map((keyHandler) =>
          keyHandler.sign(transaction),
        ),
      );
    },
  });
}

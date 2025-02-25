import { AnyAuthDescriptorRegistration } from "@ft4/accounts";
import {
  AuthDataService,
  Authenticator,
  KeyHandler,
  KeyStore,
} from "@ft4/authentication";
import { TxContext } from "@ft4/utils";
import { Buffer } from "buffer";
import { BufferId, GTX, Operation } from "postchain-client";
import { nullAuthDescriptor } from "./auth-descriptor";
import { Connection } from "@ft4/ft-session";

export const nullKeyStore: KeyStore = Object.freeze({
  id: Buffer.alloc(32, 0),
  isInteractive: false,
  sign: (tx: Buffer) => Promise.resolve(tx),
  createKeyHandler: (
    _authDescriptor: AnyAuthDescriptorRegistration | undefined,
  ) => noopKeyHandler,
});

export const noopAuthDataService: AuthDataService = Object.freeze({
  connection: {} as Connection,
  isOperationExposed: (_operationName: string) => Promise.resolve(true),
  getAuthMessageTemplate: (_operation: Operation) => Promise.resolve(""),
  getAuthDescriptorCounter: (
    _accountId: BufferId,
    _authDescriptorId: BufferId,
  ) => Promise.resolve(0),
  getLoginConfig: (_name?: string) =>
    Promise.resolve({ flags: [], rules: null }),
  getBlockchainRid: () => Buffer.alloc(32),
  getAuthHandlerForOperation: (_operationName: string) => Promise.resolve(null),
  getAllowedAuthDescriptor: (
    _operation: Operation,
    _accountId: BufferId,
    _adIds: BufferId[],
  ) => Promise.resolve(null),
});

/**
 * Creates a noop authenticator. I.e., an object that conforms to the `Authenticator` interface
 * but whose operations has no effect.
 * @param authDataService - optional mock auth data service. If not provided, a no op auth data service will be used
 */
export function createNoopAuthenticator(
  authDataService?: AuthDataService,
): Authenticator {
  return Object.freeze({
    accountId: Buffer.alloc(32, 0),
    keyHandlers: [noopKeyHandler],
    authDataService: authDataService ?? noopAuthDataService,
    getKeyHandlerForOperation: (_operation: Operation) =>
      Promise.resolve(noopKeyHandler),
    getAuthDescriptorCounter: (_authDescriptorId: BufferId) =>
      Promise.resolve(null),
  });
}

export const noopKeyHandler: KeyHandler = Object.freeze({
  authDescriptor: nullAuthDescriptor,
  keyStore: nullKeyStore,
  satisfiesAuthRequirements: (_flags: string[]) => true,
  authorize: (
    _accountId: BufferId,
    operation: Operation,
    _context: TxContext,
    _authDataService: AuthDataService,
  ) => Promise.resolve([operation]),
  sign: (_transaction: GTX) => Promise.resolve(Buffer.alloc(64, 0)),
  getSigners: (): Buffer[] => [],
});

export const noopAuthenticator = createNoopAuthenticator();

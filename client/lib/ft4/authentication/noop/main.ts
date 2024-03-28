import { AnyAuthDescriptorRegistration } from "@ft4/accounts";
import {
  AuthDataService,
  Authenticator,
  KeyHandler,
  KeyStore,
} from "@ft4/authentication";
import { BufferId, TxContext } from "@ft4/utils";
import { Buffer } from "buffer";
import { GTX, Operation } from "postchain-client";
import { nullAuthDescriptor } from "./auth-descriptor";

export const nullKeyStore: KeyStore = Object.freeze({
  id: Buffer.alloc(32, 0),
  isInteractive: false,
  sign: (tx: Buffer) => Promise.resolve(tx),
  createKeyHandler: (
    _authDescriptor: AnyAuthDescriptorRegistration | undefined,
  ) => noopKeyHandler,
});

export function createNoopAuthenticator(
  authDataService: AuthDataService,
): Authenticator {
  return Object.freeze({
    accountId: Buffer.alloc(32, 0),
    keyHandlers: [noopKeyHandler],
    authDataService,
    getKeyHandlerForOperation: (_operation: Operation) =>
      Promise.resolve(noopKeyHandler),
    getNonce: (_authDescriptorId: BufferId) => Promise.resolve(null),
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

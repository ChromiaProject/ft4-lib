import { Itransaction } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import { AuthDescriptor } from "../accounts/auth-descriptor/types";
import { Operation } from "../utils/types";
import { Buffer } from "buffer";

export interface Authenticator {
  accountId: Buffer;
  keyHandlers: KeyHandler[];

  createSession(): AuthenticatorSession;
  getAuthRequirements(operation: Operation): Promise<AuthData>;
  getKeyHandlerForOperation(
    operation: Operation
  ): Promise<KeyHandler | undefined>;
  getNonce(authDescriptorId: BufferId): Promise<number | null>;
}

export interface KeyHandler {
  authDescriptor: AuthDescriptor;
  keyStore: KeyStore;

  satisfiesAuthRequirements(flags: string[]): boolean;

  authenticate(
    accountId: BufferId,
    operation: Operation,
    authData: AuthData
  ): Promise<Operation[]>;

  sign(transaction: Itransaction): Promise<void>;

  // FIXME
  getSigners(): Buffer[];
}

export interface KeyStore {
  id: Buffer;
  // when false, signing is performed without user interaction
  isInteractive: boolean;
  createKeyHandler(authDescriptor: AuthDescriptor): KeyHandler;
}
export interface AuthenticatorSession {
  authenticator: Authenticator;
  getUsedKeyHandlers(): Set<KeyHandler>;
  getSigners(): Set<Buffer>;
  authenticate(operation: Operation): Promise<Operation[]>;
  sign(transaction: Itransaction): Promise<void>;
}

export interface AuthDataService {
  getAuthData(operation: Operation): Promise<AuthData>;
  // TODO: add account id argument
  getNonce(authDescriptorId: BufferId): Promise<number | null>;
}

export type AuthData = {
  flags: string[];
  message: string;
};

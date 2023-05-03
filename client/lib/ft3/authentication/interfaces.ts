import {
  Itransaction,
  SignatureProvider,
} from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import { AuthDescriptor } from "../account/auth-descriptor/types";
import { Operation } from "../utils/types";

export interface Authenticator {
  accountId: Buffer;
  keyHandlers: KeyHandler[];

  createSession(): AuthenticatorSession;
  getAuthRequirements(operation: Operation): Promise<string[]>;
  getKeyHandlerForOperation(
    operation: Operation
  ): Promise<KeyHandler | undefined>;
}

export interface KeyHandler {
  authDescriptor: AuthDescriptor;
  keyStore: KeyStore;

  satisfiesAuthRequirements(flags: string[]): boolean;
  authenticate(accountId: BufferId, operation: Operation): Promise<Operation[]>;
  sign(transaction: Itransaction): Promise<void>;
}

export interface KeyStore extends SignatureProvider {
  id: Buffer;
  pubKey: Buffer;
  createKeyHandler(authDescriptor: AuthDescriptor): KeyHandler;
}

export interface AuthenticatorSession {
  authenticator: Authenticator;
  getUsedKeyHandlers(): Set<KeyHandler>;
  authenticate(operation: Operation): Promise<Operation[]>;
  sign(transaction: Itransaction): Promise<void>;
}

export interface AuthDataService {
  getAuthData(operation: Operation): Promise<AuthData>;
}

export type AuthData = {
  flags: string[];
};

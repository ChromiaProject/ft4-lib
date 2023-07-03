import { Operation } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { TxBuilderTransaction } from "../utils/types";
import { AuthDescriptor } from "../accounts/auth-descriptor/types";
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

  sign(transaction: TxBuilderTransaction): Promise<void>;

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
  sign(transaction: TxBuilderTransaction): Promise<void>;
}

export interface AuthDataService {
  getAuthData(operation: Operation): Promise<AuthData>;
  // TODO: add account id argument
  getNonce(authDescriptorId: BufferId): Promise<number | null>;
  getLoginConfig(name: string | null): Promise<LoginConfig>;
}

export type AuthData = {
  flags: string[];
  message: string;
};

export type LoginConfig = {
  flags: string[];
};

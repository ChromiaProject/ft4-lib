import { Operation } from "postchain-client";
import { BufferId } from "../cryptoUtils";
import { TxContext, TxBuilderTransaction } from "../utils/types";
import { AuthDescriptor } from "../accounts/auth-descriptor/types";
import { Buffer } from "buffer";

export interface Authenticator {
  accountId: Buffer;
  keyHandlers: KeyHandler[];
  // TODO: check if authDataService can be removed
  authDataService: AuthDataService;
  createSession(): AuthenticatorSession;
  getKeyHandlerForOperation(
    operation: Operation,
  ): Promise<KeyHandler | undefined>;
  getNonce(authDescriptorId: BufferId): Promise<number | null>;
}

export interface KeyHandler {
  authDescriptor: AuthDescriptor;
  keyStore: KeyStore;

  satisfiesAuthRequirements(flags: string[]): boolean;

  authorize(
    accountId: BufferId,
    operation: Operation,
    context: TxContext,
    authDataService: AuthDataService,
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
  authorize(operation: Operation): Promise<Operation[]>;
  sign(transaction: TxBuilderTransaction): Promise<void>;
}

export interface AuthDataService {
  isOperationExposed(operationName: string): Promise<boolean>;
  getAuthFlags(operation: Operation): Promise<string[]>;
  getAuthMessageTemplate(operation: Operation): Promise<string>;
  getNonce(
    accountId: BufferId,
    authDescriptorId: BufferId,
  ): Promise<number | null>;
  getLoginConfig(name: string | undefined): Promise<LoginConfigResponse>;
  getBrid(): Buffer;
}

export type LoginConfigResponse = {
  flags: string[];
  ttl: number;
};

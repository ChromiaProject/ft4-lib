import { Buffer } from "buffer";
import { Operation } from "postchain-client";
import { BufferId, TxBuilderTransaction, TxContext } from "/ft4/utils/types";
import { AnyAuthDescriptor } from "/ft4/accounts/auth-descriptor/types";

export interface Authenticator {
  accountId: Buffer;
  keyHandlers: KeyHandler[];
  // TODO: check if authDataService can be removed
  authDataService: AuthDataService;
  createSession(): AuthenticatorSession;
  getKeyHandlerForOperation(operation: Operation): Promise<KeyHandler | null>;
  getNonce(authDescriptorId: BufferId): Promise<number | null>;
}

export interface KeyHandler {
  authDescriptor: AnyAuthDescriptor;
  keyStore: KeyStore;

  satisfiesAuthRequirements(flags: string[]): boolean;

  authorize(
    accountId: BufferId,
    operation: Operation,
    context: TxContext,
    authDataService: AuthDataService,
  ): Promise<Operation[]>;

  sign(transaction: Buffer): Promise<Buffer>;

  // FIXME
  getSigners(): Buffer[] | null;
}

export interface KeyStore {
  id: Buffer;
  // when false, signing is performed without user interaction
  isInteractive: boolean;
  sign: (digestToSign: Buffer) => Promise<Buffer>;
  createKeyHandler(authDescriptor: AnyAuthDescriptor): KeyHandler;
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
  getLoginConfig(name: string | undefined): Promise<LoginConfig | null>;
  getBrid(): Buffer;
}

export type LoginConfig = {
  flags: string[];
};

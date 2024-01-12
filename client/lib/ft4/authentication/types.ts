import { AnyAuthDescriptor } from "@ft4/accounts/auth-descriptor/types";
import { AuthHandler } from "@ft4/types";
import { BufferId, TxBuilderTransaction, TxContext } from "@ft4/utils/types";
import { Buffer } from "buffer";
import { Operation } from "postchain-client";

export interface Authenticator {
  accountId: Buffer;
  keyHandlers: KeyHandler[];
  // TODO: check if authDataService can be removed
  authDataService: AuthDataService;
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

  sign(transaction: TxBuilderTransaction): Promise<Buffer>;

  // FIXME
  getSigners(): Buffer[];
}

export interface KeyStore {
  id: Buffer;
  // when false, signing is performed without user interaction
  isInteractive: boolean;
  createKeyHandler(authDescriptor: AnyAuthDescriptor): KeyHandler;
}

export interface AuthDataService {
  isOperationExposed(operationName: string): Promise<boolean>;
  getAuthMessageTemplate(operation: Operation): Promise<string>;
  getNonce(
    accountId: BufferId,
    authDescriptorId: BufferId,
  ): Promise<number | null>;
  getLoginConfig(name: string | undefined): Promise<LoginConfig | null>;
  getBlockchainRid(): Buffer;
  getAuthHandlerForOperation(
    operationName: string,
  ): Promise<AuthHandler | null>;
  getAllowedKeyHandler(
    operation: Operation,
    accountId: Buffer,
    adIds: Buffer[],
  ): Promise<Buffer | null>;
}

export type LoginConfig = {
  flags: string[];
};

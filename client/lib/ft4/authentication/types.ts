import { AnyAuthDescriptor } from "@ft4/accounts/auth-descriptor";
import { AuthHandler } from "@ft4/types";
import { Connection } from "@ft4/index";
import { BufferId, TxContext } from "@ft4/utils";
import { Buffer } from "buffer";
import { GTX, Operation } from "postchain-client";
import { LoginConfig } from "./login-manager";
export class KeyHandlerError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "KeyHandlerError";
  }
}

export interface Authenticator {
  accountId: Buffer;
  keyHandlers: KeyHandler[];
  // TODO: check if authDataService can be removed
  authDataService: AuthDataService;
  getKeyHandlerForOperation(
    operation: Operation,
    txContext: TxContext,
  ): Promise<KeyHandler | null>;
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

  sign(transaction: GTX): Promise<Buffer>;

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
  connection: Connection;
  isOperationExposed(operationName: string): Promise<boolean>;
  getAuthMessageTemplate(operation: Operation): Promise<string>;
  getNonce(
    accountId: BufferId,
    authDescriptorId: BufferId,
  ): Promise<number | null>;
  getLoginConfig(name?: string): Promise<LoginConfig>;
  getBlockchainRid(): Buffer;
  getAuthHandlerForOperation(
    operationName: string,
  ): Promise<AuthHandler | null>;
  getAllowedAuthDescriptor(
    operation: Operation,
    accountId: BufferId,
    adIds: BufferId[],
  ): Promise<Buffer | null>;
}

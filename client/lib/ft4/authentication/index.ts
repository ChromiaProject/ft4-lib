import { Operation, QueryObject, RawGtv, formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import {
  AuthDataService,
  Authenticator,
  AuthenticatorSession,
  KeyHandler,
} from "./interfaces";
import { TxBuilderTransaction } from "../utils/types";
import { Buffer } from "buffer";

export * from "./evm";
export * from "./ft";
export * from "./interfaces";

export function createAuthenticator(
  accountId: BufferId,
  keyHandlers: KeyHandler[],
  authDataService: AuthDataService
): Authenticator {
  const authenticator = Object.freeze({
    accountId: formatter.ensureBuffer(accountId),
    authDataService,
    keyHandlers,
    createSession: () =>
      createAuthenticatorSession(authenticator, authDataService),
    getAuthFlags: (operation: Operation) =>
      getAuthFlags(authDataService, operation),
    getKeyHandlerForOperation: (operation: Operation) =>
      getKeyHandlerForOperation(authDataService, keyHandlers, operation),
    getNonce: (authDescriptorId: BufferId) =>
      authDataService.getNonce(authDescriptorId),
  });

  return authenticator;
}

async function getAuthFlags(
  authDataService: AuthDataService,
  operation: Operation
): Promise<string[]> {
  return await authDataService.getAuthFlags(operation);
}

async function getKeyHandlerForOperation(
  authDataService: AuthDataService,
  keyHandlers: KeyHandler[],
  operation: Operation
): Promise<KeyHandler | undefined> {
  const flags = await getAuthFlags(authDataService, operation);

  return keyHandlers.find((keyHandler) =>
    keyHandler.satisfiesAuthRequirements(flags)
  );
}

function createAuthenticatorSession(
  authenticator: Authenticator,
  authDataService: AuthDataService
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
          ]))
      );
      return signers;
    },
    authenticate: async (operation: Operation) => {
      const keyHandler = await authenticator.getKeyHandlerForOperation(
        operation
      );
      if (!keyHandler) {
        // TODO: replace `operation[0]` with `operation.name` when Operation type is updated
        throw new Error(`Cannot authenticate operation: ${operation[0]}`);
      }
      usedKeyHandlers.add(keyHandler);
      return await keyHandler.authenticate(
        authenticator.accountId,
        operation,
        // FIXME!!!!!!!!!!!!!!!!!!!
        0,
        authDataService
      );
    },
    sign: async (transaction: TxBuilderTransaction) => {
      await Promise.all(
        Array.from(usedKeyHandlers).map((keyHandler) =>
          keyHandler.sign(transaction)
        )
      );
    },
  });
}

export function authFlags(
  operation: Operation
): QueryObject<{ op_name: string }> {
  return {
    name: "ft.get_auth_flags",
    args: {
      op_name: operation.name,
    },
  };
}

export function authMessageTemplate(
  operation: Operation
): QueryObject<{ op_name: string; op_args: RawGtv[] }> {
  return {
    name: "ft.get_auth_message_template",
    args: {
      op_name: operation.name,
      // TODO: check if putting operation[1] inside an array could cause issues
      op_args: operation.args,
    },
  };
}

export function nonce(
  authDescriptorId: BufferId
): QueryObject<{ auth_descriptor_id: Buffer }> {
  return {
    name: "ft4.get_ctr_for_auth_descriptor",
    args: {
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

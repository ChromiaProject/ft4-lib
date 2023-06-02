import { formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import {
  AuthData,
  AuthDataService,
  Authenticator,
  AuthenticatorSession,
  KeyHandler,
} from "./interfaces";
import { Operation, QueryObject } from "../utils/types";
import { Itransaction } from "postchain-client/built/src/gtx/interfaces";

export * from "./evm";
export * from "./ft";
export * from "./interfaces";

export function createAuthenicator(
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
    getAuthRequirements: (operation: Operation) =>
      getAuthRequirements(authDataService, operation),
    getAuthFlags: (operation: Operation) =>
      getAuthFlags(authDataService, operation),
    getKeyHandlerForOperation: (operation: Operation) =>
      getKeyHandlerForOperation(authDataService, keyHandlers, operation),
    getNonce: (authDescriptorId: BufferId) =>
      authDataService.getNonce(authDescriptorId),
  });

  return authenticator;
}

async function getAuthRequirements(
  authDataService: AuthDataService,
  operation: Operation
): Promise<AuthData> {
  return authDataService.getAuthData(operation);
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
    sign: async (transaction: Itransaction) => {
      await Promise.all(
        Array.from(usedKeyHandlers).map((keyHandler) =>
          keyHandler.sign(transaction)
        )
      );
    },
  });
}

export function authDataQuery(operation: Operation): QueryObject {
  const [opName, ...args] = operation;
  return {
    name: `${opName}_auth_data`,
    args: { gtv: args },
  };
}

export const defaultFTAuthData: QueryObject = {
  name: `ft3.default_auth_data`,
  args: {},
};

export function authFlags(operation: Operation): QueryObject {
  return {
    name: "ft.get_auth_flags",
    args: {
      op_name: operation[0],
    },
  };
}

export function authMessageTemplate(operation: Operation): QueryObject {
  return {
    name: "ft.get_auth_message_template",
    args: {
      op_name: operation[0],
      // TODO: check if putting operation[1] inside an array could cause issues
      op_args: [operation[1]],
    },
  };
}

export function nonce(authDescriptorId: BufferId): QueryObject {
  return {
    name: "ft3.get_ctr_for_auth_descriptor",
    args: {
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

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

export function createAuthenicator(
  accountId: BufferId,
  keyHandlers: KeyHandler[],
  authDataService: AuthDataService
): Authenticator {
  const authenticator = Object.freeze({
    accountId: formatter.ensureBuffer(accountId),
    keyHandlers,
    createSession: () => createAuthenticatorSession(authenticator),
    getAuthRequirements: (operation: Operation) =>
      getAuthRequirements(authDataService, operation),
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

async function getKeyHandlerForOperation(
  authDataService: AuthDataService,
  keyHandlers: KeyHandler[],
  operation: Operation
): Promise<KeyHandler | undefined> {
  const authRequirements = await getAuthRequirements(
    authDataService,
    operation
  );
  return keyHandlers.find((keyHandler) =>
    keyHandler.satisfiesAuthRequirements(authRequirements.flags)
  );
}

function createAuthenticatorSession(
  authenticator: Authenticator
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
      // `getKeyHandlerForOperation` internally calls `getAuthRequirements`
      // Find a way to make only one call
      const authData = await authenticator.getAuthRequirements(operation);
      return await keyHandler.authenticate(
        authenticator.accountId,
        operation,
        authData
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
  return {
    name: `${operation[0]}_auth_data`,
    args: {},
  };
}

export const defaultFTAuthData: QueryObject = {
  name: `ft3.default_auth_data`,
  args: {},
};

export function nonce(authDescriptorId: BufferId): QueryObject {
  return {
    name: "ft3.get_ctr_for_auth_descriptor",
    args: {
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

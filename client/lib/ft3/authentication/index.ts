import { formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import {
  AuthDataService,
  Authenticator,
  AuthenticatorSession,
  KeyHandler,
} from "./interfaces";
import { Operation } from "../utils/types";
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
  });

  return authenticator;
}

async function getAuthRequirements(
  authDataService: AuthDataService,
  operation: Operation
): Promise<string[]> {
  const authData = await authDataService.getAuthData(operation);
  return authData.flags;
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
    keyHandler.satisfiesAuthRequirements(authRequirements)
  );
}

function createAuthenticatorSession(
  authenticator: Authenticator
): AuthenticatorSession {
  const usedKeyHandlers = new Set<KeyHandler>();

  return Object.freeze({
    authenticator,
    getUsedKeyHandlers: () => new Set(usedKeyHandlers),
    authenticate: async (operation: Operation) => {
      const keyHandler = await authenticator.getKeyHandlerForOperation(
        operation
      );
      if (!keyHandler) {
        // TODO: replace `operation[0]` with `operation.name` when Operation type is updated
        throw new Error(`Cannot authenticate operation: ${operation[0]}`);
      }
      usedKeyHandlers.add(keyHandler);
      return await keyHandler.authenticate(authenticator.accountId, operation);
    },
    sign: async (transaction: Itransaction) => {
      await Array.from(usedKeyHandlers).map((keyHandler) =>
        keyHandler.sign(transaction)
      );
      return;
    },
  });
}

import { createBaseAuthDescriptorValidator } from "./evaluation";
import {
  AuthDescriptorValidationService,
  AuthDescriptorValidator,
} from "./types";
import {
  getAuthDescriptorCounterIdForTxContext,
  BufferId,
  TxContext,
} from "@ft4/utils";
import { AuthDataService } from "@ft4/authentication";
import { Connection } from "@ft4/ft-session";

/**
 * Creates an `AuthDescriptorValidator` that can be used to validate auth descriptors
 * @param authDataService - the auth data service to use
 * @param useCache - wether the validator should store validation results between calls or if it should perform a new validation each time
 * @returns an `AuthDescriptorValidator` instance
 */
export function createAuthDescriptorValidator(
  authDataService: AuthDataService,
  useCache: boolean,
  connection: Connection,
): AuthDescriptorValidator {
  const service = useCache
    ? authDescriptorValidationServiceWithCache(authDataService)
    : authDescriptorValidationService(authDataService);
  return createBaseAuthDescriptorValidator(service, connection);
}

/**
 * Creates an `AuthDescriptorValidator` that can be used to validate auth descriptors
 * @param authDataService - the auth data service to use
 * @param txContext - the context to use. Used to track counters without posting operations to the blockchain
 * @returns an `AuthDescriptorValidator` instance
 */
export function createAuthDescriptorValidatorWithTxContext(
  authDataService: AuthDataService,
  txContext: TxContext,
  connection: Connection,
): AuthDescriptorValidator {
  const service = authDescriptorValidationServiceWithCacheAndTxContext(
    authDataService,
    txContext,
  );
  return createBaseAuthDescriptorValidator(service, connection);
}

function authDescriptorValidationServiceWithCache(
  authDataService: AuthDataService,
): AuthDescriptorValidationService {
  const counters: {
    [accountId: string]: { [authDescriptorId: string]: number | null };
  } = {};
  return Object.freeze({
    getAuthDescriptorCounter: async (
      accountId: BufferId,
      authDescriptorId: BufferId,
    ) => {
      const accId = accountId.toString("hex");
      const adId = authDescriptorId.toString("hex");
      let counter = counters[accId]?.[adId];
      if (counter !== undefined) return counter;
      counter = await authDataService.getAuthDescriptorCounter(
        accountId,
        authDescriptorId,
      );
      counters[accId] = counters[accId] ?? {};
      counters[accId][adId] = counter;
      return counter;
    },
  });
}

function authDescriptorValidationServiceWithCacheAndTxContext(
  authDataService: AuthDataService,
  txContext: TxContext,
): AuthDescriptorValidationService {
  return Object.freeze({
    getAuthDescriptorCounter: async (
      accountId: BufferId,
      authDescriptorId: BufferId,
    ) => {
      const counterId = getAuthDescriptorCounterIdForTxContext(
        accountId,
        authDescriptorId,
      );
      let counter = txContext[counterId];
      if (counter === undefined) {
        counter = await authDataService.getAuthDescriptorCounter(
          accountId,
          authDescriptorId,
        );
        txContext[counterId] = counter;
      }
      return counter;
    },
  });
}

function authDescriptorValidationService(
  authDataService: AuthDataService,
): AuthDescriptorValidationService {
  return Object.freeze({
    getAuthDescriptorCounter: authDataService.getAuthDescriptorCounter,
  });
}

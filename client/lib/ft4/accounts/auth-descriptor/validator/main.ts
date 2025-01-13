import { createBaseAuthDescriptorValidator } from "./evaluation";
import {
  AuthDescriptorValidationService,
  AuthDescriptorValidator,
} from "./types";
import { getAuthDescriptorCounterIdForTxContext, TxContext } from "@ft4/utils";
import { AuthDataService } from "@ft4/authentication";
import { BufferId } from "postchain-client";

/**
 * Creates an `AuthDescriptorValidator` that can be used to validate auth descriptors
 * @param authDataService - the auth data service to use
 * @param useCache - wether the validator should store validation results between calls or if it should perform a new validation each time
 * @returns an `AuthDescriptorValidator` instance
 */
export function createAuthDescriptorValidator(
  authDataService: AuthDataService,
  useCache: boolean,
): AuthDescriptorValidator {
  const service = useCache
    ? authDescriptorValidationServiceWithCache(authDataService)
    : authDescriptorValidationService(authDataService);
  return createBaseAuthDescriptorValidator(service);
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
): AuthDescriptorValidator {
  const service = authDescriptorValidationServiceWithCacheAndTxContext(
    authDataService,
    txContext,
  );
  return createBaseAuthDescriptorValidator(service);
}

function authDescriptorValidationServiceWithCache(
  authDataService: AuthDataService,
): AuthDescriptorValidationService {
  let height: number;
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
    getBlockHeight: async () => {
      if (height !== undefined) return height;
      height = await authDataService.connection.getBlockHeight();
      return height;
    },
  });
}

function authDescriptorValidationServiceWithCacheAndTxContext(
  authDataService: AuthDataService,
  txContext: TxContext,
): AuthDescriptorValidationService {
  let height: number;
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
    getBlockHeight: async () => {
      if (height !== undefined) return height;
      height = await authDataService.connection.getBlockHeight();
      return height;
    },
  });
}

function authDescriptorValidationService(
  authDataService: AuthDataService,
): AuthDescriptorValidationService {
  return Object.freeze({
    getAuthDescriptorCounter: authDataService.getAuthDescriptorCounter,
    getBlockHeight: authDataService.connection.getBlockHeight,
  });
}

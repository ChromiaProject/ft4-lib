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

export function createAuthDescriptorValidator(
  authDataService: AuthDataService,
  useCache: boolean,
): AuthDescriptorValidator {
  const service = useCache
    ? authDescriptorValidationServiceWithCache(authDataService)
    : authDescriptorValidationService(authDataService);
  return createBaseAuthDescriptorValidator(service);
}

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

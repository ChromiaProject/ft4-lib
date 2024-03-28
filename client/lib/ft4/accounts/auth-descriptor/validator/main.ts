
import { createBaseAuthDescriptorValidator } from "./evaluation";
import {
  AuthDescriptorValidationService,
  AuthDescriptorValidator,
} from "./types";
import { getNonceIdForTxContext, BufferId, TxContext } from "@ft4/utils";
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
  const nonces: {
    [accountId: string]: { [authDescriptorId: string]: number | null };
  } = {};
  return Object.freeze({
    getNonce: async (accountId: BufferId, authDescriptorId: BufferId) => {
      const accId = accountId.toString("hex");
      const adId = authDescriptorId.toString("hex");
      let nonce = nonces[accId]?.[adId];
      if (nonce !== undefined) return nonce;
      nonce = await authDataService.getNonce(accountId, authDescriptorId);
      nonces[accId] = nonces[accId] ?? {};
      nonces[accId][adId] = nonce;
      return nonce;
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
    getNonce: async (accountId: BufferId, authDescriptorId: BufferId) => {
      const nonceId = getNonceIdForTxContext(accountId, authDescriptorId);
      let nonce = txContext[nonceId];
      if (nonce === undefined) {
        nonce = await authDataService.getNonce(accountId, authDescriptorId);
        txContext[nonceId] = nonce;
      }
      return nonce;
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
    getNonce: authDataService.getNonce,
    getBlockHeight: authDataService.connection.getBlockHeight,
  });
}

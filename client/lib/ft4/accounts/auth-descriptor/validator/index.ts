import {
  isActive,
  hasExpired,
  AuthDescriptorValidationService,
} from "./evaluation";
import { AnyAuthDescriptor } from "../types";
import { AuthDescriptorValidator } from "./types";
import { BufferId, TxContext } from "@ft4/utils/types";
import { Connection } from "@ft4/index";
import { createAuthDataService } from "@ft4/ft-session";
import { getNonceIdForTxContext } from "@ft4/utils";

export { AuthDescriptorValidator } from "./types";

export function createAuthDescriptorValidator(
  connection: Connection,
  useCache: boolean,
): AuthDescriptorValidator {
  return useCache
    ? createCachedAuthDescriptorValidator(connection)
    : createNoCacheAuthDescriptorValidator(connection);
}

function createNoCacheAuthDescriptorValidator(
  connection: Connection,
): AuthDescriptorValidator {
  const service = authDescriptorValidationService(connection);
  return {
    isActive: (authDescriptor: AnyAuthDescriptor) =>
      isActive(authDescriptor, service),
    hasExpired: async (authDescriptor: AnyAuthDescriptor) =>
      hasExpired(authDescriptor, service),
  };
}

function createCachedAuthDescriptorValidator(
  connection: Connection,
): AuthDescriptorValidator {
  const service = cachedAuthDescriptorValidationService(connection);
  return {
    isActive: (authDescriptor: AnyAuthDescriptor) =>
      isActive(authDescriptor, service),
    hasExpired: async (authDescriptor: AnyAuthDescriptor) =>
      hasExpired(authDescriptor, service),
  };
}

export function createAuthDescriptorValidatorWithTxContext(
  connection: Connection,
  txContext: TxContext,
): AuthDescriptorValidator {
  const service = cachedTxAuthDescriptorValidationService(
    connection,
    txContext,
  );
  return {
    isActive: (authDescriptor: AnyAuthDescriptor) =>
      isActive(authDescriptor, service),
    hasExpired: async (authDescriptor: AnyAuthDescriptor) =>
      hasExpired(authDescriptor, service),
  };
}

function cachedAuthDescriptorValidationService(
  connection: Connection,
): AuthDescriptorValidationService {
  let height: number;
  const nonces: {
    [accountId: string]: { [authDescriptorId: string]: number | null };
  } = {};
  const authDataService = createAuthDataService(connection);
  return Object.freeze({
    getNonce: async (accountId: BufferId, authDescriptorId: BufferId) => {
      const [adId, accId] = [authDescriptorId, accountId].map((x) =>
        x.toString("hex"),
      ) as [ad: string, acc: string];
      let nonce = nonces[accId]?.[adId];
      if (nonce !== undefined) return nonce;
      nonce = await authDataService.getNonce(accountId, authDescriptorId);
      nonces[accId] = nonces[accId] ?? {};
      nonces[accId][adId] = nonce;
      return nonce;
    },
    getBlockHeight: async () => {
      if (height !== undefined) return height;
      height = await connection.getBlockHeight();
      return height;
    },
  });
}

function cachedTxAuthDescriptorValidationService(
  connection: Connection,
  txContext: TxContext,
): AuthDescriptorValidationService {
  let height: number;
  const authDataService = createAuthDataService(connection);
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
      height = await connection.getBlockHeight();
      return height;
    },
  });
}

function authDescriptorValidationService(
  connection: Connection,
): AuthDescriptorValidationService {
  const authDataService = createAuthDataService(connection);
  return Object.freeze({
    getNonce: authDataService.getNonce,
    getBlockHeight: connection.getBlockHeight,
  });
}

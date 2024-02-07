import { BufferId, getNonceIdForTxContext } from "@ft4/utils";
import { isActive, hasExpired } from "./evaluation";
import { AnyAuthDescriptor } from "../types";
import { AuthDescriptorValidator } from "./types";
import { TxContext } from "@ft4/utils/types";
import { Connection } from "@ft4/index";
import { createAuthDataService } from "@ft4/ft-session";

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
  const authDataService = createAuthDataService(connection);
  const getBlockHeight = async () => {
    const info = await connection.client.getBlocksInfo(1);
    return info[0].height;
  };
  return {
    isActive: (authDescriptor: AnyAuthDescriptor) =>
      isActive(authDescriptor, getBlockHeight),
    hasExpired: async (
      authDescriptor: AnyAuthDescriptor,
      accountId: BufferId,
    ) => {
      const getNonce = async (authDescriptorId: BufferId) =>
        authDataService.getNonce(accountId, authDescriptorId);
      return hasExpired(authDescriptor, getBlockHeight, getNonce);
    },
  };
}

function createCachedAuthDescriptorValidator(
  connection: Connection,
): AuthDescriptorValidator {
  const authDataService = createAuthDataService(connection);
  let height: number;
  const nonces: {
    [accountId: string]: { [authDescriptorId: string]: number | null };
  } = {};
  const getBlockHeight = async () => {
    if (height !== undefined) return height;
    height = await connection.getBlockHeight();
    return height;
  };
  return {
    isActive: (authDescriptor: AnyAuthDescriptor) =>
      isActive(authDescriptor, getBlockHeight),
    hasExpired: async (
      authDescriptor: AnyAuthDescriptor,
      accountId: BufferId,
    ) => {
      const getNonce = async (authDescriptorId: BufferId) => {
        const [adId, accId] = [authDescriptorId, accountId].map((x) =>
          x.toString("hex"),
        ) as [ad: string, acc: string];
        let nonce = nonces[accId]?.[adId];
        if (nonce !== undefined) return nonce;
        nonce = await authDataService.getNonce(accountId, authDescriptorId);
        nonces[accId] = nonces[accId] ?? {};
        nonces[accId][adId] = nonce;
        return nonce;
      };
      return hasExpired(authDescriptor, getBlockHeight, getNonce);
    },
  };
}

export function createAuthDescriptorValidatorWithTxContext(
  connection: Connection,
  txContext: TxContext,
): AuthDescriptorValidator {
  const authDataService = createAuthDataService(connection);
  let height: number;
  const getBlockHeight = async () => {
    if (height !== undefined) return height;
    height = await connection.getBlockHeight();
    return height;
  };
  return {
    isActive: (authDescriptor: AnyAuthDescriptor) =>
      isActive(authDescriptor, getBlockHeight),
    hasExpired: async (
      authDescriptor: AnyAuthDescriptor,
      accountId: BufferId,
    ) => {
      const getNonce = async (authDescriptorId: BufferId) => {
        const nonceId = getNonceIdForTxContext(accountId, authDescriptorId);
        let nonce = txContext[nonceId];
        if (nonce === undefined) {
          nonce = await authDataService.getNonce(accountId, authDescriptorId);
          txContext[nonceId] = nonce;
        }
        return nonce;
      };
      return hasExpired(authDescriptor, getBlockHeight, getNonce);
    },
  };
}

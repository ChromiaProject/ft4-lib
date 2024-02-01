import { BufferId, getNonceIdForTxContext } from "@ft4/utils";
import { AuthDataService } from "@ft4/authentication";
import { isActive, hasExpired } from "./evaluation";
import { AnyAuthDescriptor, AuthDescriptorValidator } from "../types";
import { TxContext } from "@ft4/utils/types";

export function createAuthDescriptorValidator(
  authDataService: AuthDataService,
  useCache: boolean,
): AuthDescriptorValidator {
  return useCache
    ? createCachedAuthDescriptorValidator(authDataService)
    : createNoCacheAuthDescriptorValidator(authDataService);
}

function createNoCacheAuthDescriptorValidator(
  authDataService: AuthDataService,
): AuthDescriptorValidator {
  const getBlockHeight = async () => {
    const info = await authDataService.connection.client.getBlocksInfo(1);
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
  authDataService: AuthDataService,
): AuthDescriptorValidator {
  let height: number;
  const nonces: {
    [accountId: string]: { [authDescriptorId: string]: number | null };
  } = {};
  const getBlockHeight = async () => {
    if (height !== undefined) return height;
    const info = await authDataService.connection.client.getBlocksInfo(1);
    height = info[0].height;
    return info[0].height;
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
  authDataService: AuthDataService,
  txContext: TxContext,
): AuthDescriptorValidator {
  let height: number;
  const getBlockHeight = async () => {
    if (height !== undefined) return height;
    const info = await authDataService.connection.client.getBlocksInfo(1);
    height = info[0].height;
    return info[0].height;
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

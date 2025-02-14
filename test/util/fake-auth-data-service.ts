import { AuthDataService, LoginConfig } from "@ft4/authentication";
import { BufferId } from "@ft4/utils";
import { Buffer } from "buffer";
import { Operation } from "postchain-client";
import { asyncNumberGenerator } from "./util";

export function createFakeAuthDataService(
  data: { [operation: string]: AuthData },
  isOperationExposedFn?: (operationName: string) => Promise<boolean>,
): AuthDataService {
  const generator = asyncNumberGenerator();
  return {
    isOperationExposed: isOperationExposedFn ?? (() => Promise.resolve(true)),
    getAuthMessageTemplate: (operation: Operation) =>
      Promise.resolve(data[operation.name].message),
    getAuthDescriptorCounter: (
      _accountId: BufferId,
      _authDescriptorId: BufferId,
    ) => generator.next().value,
    getLoginConfig: (_configName: string) =>
      Promise.resolve({ flags: [], rules: null } as LoginConfig),
    getBlockchainRid: () => Buffer.alloc(32),
    getAuthHandlerForOperation: (operationName: string) =>
      Promise.resolve({
        name: operationName,
        flags: data[operationName].flags,
        dynamic: true,
      }),
    getAllowedAuthDescriptor: (
      operation: Operation,
      accountId: Buffer,
      adIds: Buffer[],
    ) => Promise.resolve(adIds[0]),
  };
}

export type AuthData = {
  flags: string[];
  message: string;
};

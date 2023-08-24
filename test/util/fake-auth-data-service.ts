import { Operation } from "postchain-client";
import { BufferId } from "../../client/lib/cryptoUtils";
import { AuthDataService } from "../../client/lib/ft4/authentication/types";

export function createFakeAuthDataService(
  data: { [operation: string]: AuthData },
  isOperationExposedFn?: (operationName: string) => Promise<boolean>,
): AuthDataService {
  return {
    isOperationExposed: isOperationExposedFn || (() => Promise.resolve(true)),
    getAuthFlags: (operation: Operation) =>
      Promise.resolve(data[operation.name].flags),
    getAuthMessageTemplate: (operation: Operation) =>
      Promise.resolve(data[operation.name].message),
    // eslint-disable-next-line
    getNonce: (authDescriptorId: BufferId) => Promise.resolve(0),
    // eslint-disable-next-line
    getLoginConfig: (configName: string) => Promise.resolve({ flags: [] }),
  };
}

export type AuthData = {
  flags: string[];
  message: string;
};

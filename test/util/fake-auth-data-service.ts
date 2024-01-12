import { AuthDataService } from "@ft4/authentication/types";
import { BufferId } from "@ft4/utils";
import { Operation } from "postchain-client";

export function createFakeAuthDataService(
  data: { [operation: string]: AuthData },
  isOperationExposedFn?: (operationName: string) => Promise<boolean>,
): AuthDataService {
  const generator = numberGenerator();
  return {
    isOperationExposed: isOperationExposedFn || (() => Promise.resolve(true)),
    getAuthMessageTemplate: (operation: Operation) =>
      Promise.resolve(data[operation.name].message),
    // eslint-disable-next-line
    getNonce: (accountId: BufferId, authDescriptorId: BufferId) =>
      generator.next().value,
    // eslint-disable-next-line
    getLoginConfig: (configName: string) => Promise.resolve({ flags: [] }),
    getBlockchainRid: () => Buffer.from(""),
    getAuthHandlerForOperation: (operationName: string) =>
      Promise.resolve({
        name: operationName,
        flags: data[operationName].flags,
        dynamic: true,
      }),
    getAllowedKeyHandler: (
      operation: Operation,
      accountId: Buffer,
      adIds: Buffer[],
    ) => Promise.resolve(adIds[0]),
  };
}

function* numberGenerator(): Generator<Promise<number>> {
  let count = 0;
  while (true) {
    yield Promise.resolve(count++);
  }
}

export type AuthData = {
  flags: string[];
  message: string;
};

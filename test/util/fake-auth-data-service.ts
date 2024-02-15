import { AuthDataService } from "@ft4/authentication";
import { LoginConfig } from "@ft4/authentication/login-manager";
import { Connection } from "@ft4/index";
import { Buffer } from "buffer";
import { BufferId } from "@ft4/utils";
import { Operation } from "postchain-client";

export function createFakeAuthDataService(
  data: { [operation: string]: AuthData },
  isOperationExposedFn?: (operationName: string) => Promise<boolean>,
): AuthDataService {
  const generator = numberGenerator();
  return {
    connection: {
      client: {
        getBlocksInfo: (_limit: number) => generator.next().value,
      },
    } as unknown as Connection,
    isOperationExposed: isOperationExposedFn ?? (() => Promise.resolve(true)),
    getAuthMessageTemplate: (operation: Operation) =>
      Promise.resolve(data[operation.name].message),
    getNonce: (_accountId: BufferId, _authDescriptorId: BufferId) =>
      generator.next().value,
    getLoginConfig: (_configName: string) =>
      Promise.resolve({ flags: [], rules: null } as LoginConfig),
    getBlockchainRid: () => Buffer.from(""),
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

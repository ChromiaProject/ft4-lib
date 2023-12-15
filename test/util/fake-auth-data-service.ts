import { Operation } from "postchain-client";
import { AuthDataService } from "@ft4/authentication/types";
import { LoginConfig } from "@ft4/authentication/login-manager";
import { Connection } from "@ft4/index";
import { BufferId } from "@ft4/utils/types";

export function createFakeAuthDataService(
  data: { [operation: string]: AuthData },
  isOperationExposedFn?: (operationName: string) => Promise<boolean>,
): AuthDataService {
  const generator = numberGenerator();
  return {
    connection: null as unknown as Connection,
    isOperationExposed: isOperationExposedFn || (() => Promise.resolve(true)),
    getAuthFlags: (operation: Operation) =>
      Promise.resolve(data[operation.name].flags),
    getAuthMessageTemplate: (operation: Operation) =>
      Promise.resolve(data[operation.name].message),
    // eslint-disable-next-line
    getNonce: (accountId: BufferId, authDescriptorId: BufferId) =>
      generator.next().value,
    // eslint-disable-next-line
    getLoginConfig: (configName: string) =>
      Promise.resolve({ flags: [], rules: null } as LoginConfig),
    getBrid: () => Buffer.from(""),
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

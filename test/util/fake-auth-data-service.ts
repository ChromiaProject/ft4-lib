import { AuthDataService, KeyHandler } from "@ft4/authentication/types";
import { BufferId } from "@ft4/utils";
import { Operation, RawGtv } from "postchain-client";

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
    getAllowedKeyHandler: (
      operationName: string,
      args: RawGtv,
      accountId: Buffer,
      khs: KeyHandler[],
    ) =>
      Promise.resolve(
        khs.filter((kh) =>
          kh.satisfiesAuthRequirements(data[operationName].flags),
        )[0],
      ),
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

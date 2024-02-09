import { Operation } from "postchain-client";
import { AuthDataService, Authenticator } from "../types";
import { noopKeyHandler } from "./key-handler";
import { BufferId } from "@ft4/utils";

export function createNoopAuthenticator(
  authDataService: AuthDataService,
): Authenticator {
  return Object.freeze({
    accountId: Buffer.alloc(32, 0),
    keyHandlers: [noopKeyHandler],
    authDataService,
    getKeyHandlerForOperation: (_operation: Operation) =>
      Promise.resolve(noopKeyHandler),
    getNonce: (_authDescriptorId: BufferId) => Promise.resolve(null),
  });
}

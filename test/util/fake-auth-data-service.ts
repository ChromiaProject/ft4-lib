import { Operation } from "postchain-client";
import { BufferId } from "../../client/lib/cryptoUtils";
import {
  AuthData,
  AuthDataService,
} from "../../client/lib/ft4/authentication/interfaces";

export function createFakeAuthDataService(data: {
  [operation: string]: AuthData;
}): AuthDataService {
  return {
    getAuthData: (operation: Operation) =>
      Promise.resolve(data[operation.name]),
    // eslint-disable-next-line
    getNonce: (authDescriptorId: BufferId) => Promise.resolve(0),
  };
}

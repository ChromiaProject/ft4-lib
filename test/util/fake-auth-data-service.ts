import { BufferId } from "../../client/lib/cryptoUtils";
import {
  AuthData,
  AuthDataService,
} from "../../client/lib/ft3/authentication/types";
import { Operation } from "../../client/lib/ft3/utils/types";

export function createFakeAuthDataService(data: {
  [operation: string]: AuthData;
}): AuthDataService {
  return {
    getAuthData: (operation: Operation) => Promise.resolve(data[operation[0]]),
    // eslint-disable-next-line
    getNonce: (authDescriptorId: BufferId) => Promise.resolve(0),
  };
}

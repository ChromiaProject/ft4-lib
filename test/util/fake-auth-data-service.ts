import {
  AuthData,
  AuthDataService,
} from "../../client/lib/ft3/authentication/interfaces";
import { Operation } from "../../client/lib/ft3/utils/types";

export function createFakeAuthDataService(data: {
  [operation: string]: AuthData;
}): AuthDataService {
  return {
    getAuthData: (operation: Operation) => Promise.resolve(data[operation[0]]),
  };
}

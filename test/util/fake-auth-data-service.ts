import {
  AuthData,
  AuthDataService,
} from "../../client/lib/ft3/authentication/interfaces";
import { Operation } from "../../client/lib/ft3/utils/types";

export function createFakeAuthDataService(
  data: Map<string, AuthData>
): AuthDataService {
  return {
    getAuthData: (operation: Operation) =>
      Promise.resolve(data.get(operation[0])),
  };
}

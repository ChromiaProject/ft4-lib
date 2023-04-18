import { op } from "../utils";
import { Operation } from "../utils/types";
import { AuthDescriptor } from "./auth-descriptor/types";

export function registerOp(authDescriptor: AuthDescriptor): Operation {
  return op("ft3.dev_register_account", authDescriptor);
}

// one operation that updates the counter of rate limit of the account but does not cost points
export function freeOp(accountId: Buffer): Operation {
  return ["ft3.dev_free_op", accountId];
}

export function givePointsOp(accountId: Buffer, points: number): Operation {
  return ["ft3.dev_give_points", accountId, points];
}

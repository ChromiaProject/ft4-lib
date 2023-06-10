import { op } from "../utils";
import { Operation } from "../utils/types";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";

export function registerOp(authDescriptor: AuthDescriptor): Operation {
  const ad = authDesc.toGtv(authDescriptor);
  return op("ft3.dev_register_account", ad);
}

// one operation that updates the counter of rate limit of the account but does not cost points
export function freeOp(accountId: Buffer): Operation {
  return ["ft3.dev_free_op", accountId];
}

export function addRateLimitPointsOp(accountId: Buffer, points: number): Operation {
  return ["ft3.dev_add_rate_limit_points", accountId, points];
}

import { op } from "../utils";
import { Operation } from "../utils/types";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";

export function registerOp(authDescriptor: AuthDescriptor): Operation {
  const ad = authDesc.toGtv(authDescriptor);
  return op("ft4.admin.register_account", ad);
}

export function addRateLimitPointsOp(
  accountId: Buffer,
  points: number
): Operation {
  return ["ft4.admin.add_rate_limit_points", accountId, points];
}

import { AuthDescriptor } from "./account";
import Operation from "../core/operation";

export function register(authDescriptor: AuthDescriptor): Operation {
  return new Operation("ft3.dev_register_account", authDescriptor);
}

// one operation that updates the counter of rate limit of the account but does not cost points
export function freeOp(accountId: Buffer): Operation {
  return new Operation("ft3.dev_free_op", accountId);
}

export function givePoints(accountId: Buffer, points: number): Operation {
  return new Operation("ft3.dev_give_points", accountId, points);
}

import { op } from "../utils";
import { Operation } from "postchain-client";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";

export function registerOp(authDescriptor: AuthDescriptor): Operation {
  const ad = authDesc.toGtv(authDescriptor);
  return op("ft4.admin.register_account", ad);
}

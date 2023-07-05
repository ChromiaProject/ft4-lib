import { op, _op } from "../utils";
import { Operation } from "../utils/types";
import { Operation as _Operation } from "postchain-client";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";

export function registerOp(authDescriptor: AuthDescriptor): Operation {
  const ad = authDesc.toGtv(authDescriptor);
  return op("ft4.admin.register_account", ad);
}

export function _registerOp(authDescriptor: AuthDescriptor): _Operation {
  const ad = authDesc.toGtv(authDescriptor);
  return _op("ft4.admin.register_account", ad);
}

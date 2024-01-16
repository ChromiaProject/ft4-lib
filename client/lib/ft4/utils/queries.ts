import { AuthHandler } from "@ft4/types";
import { DictPair, QueryObject, RawGtv, formatter } from "postchain-client";
import { BufferId } from "./types";

export function rellAppStructure(): QueryObject<{
  modules: Record<string, DictPair>;
}> {
  return {
    name: "rell.get_app_structure",
    args: {},
  };
}

export function allAuthHandlers(): QueryObject<AuthHandler[]> {
  return {
    name: "ft4.get_all_auth_handlers",
  };
}

export function authHandlerForOperation(
  opName: string,
): QueryObject<AuthHandler | null, { name: string }> {
  return {
    name: "ft4.get_auth_handler_for_operation",
    args: {
      name: opName,
    },
  };
}

export function firstAllowedAuthDescriptor(
  opName: string,
  args: RawGtv,
  accountId: BufferId,
  ids: BufferId[],
): QueryObject<
  Buffer | null,
  { op_name: string; args: RawGtv; account_id: Buffer; ad_ids: Buffer[] }
> {
  return {
    name: "ft4.get_first_allowed_auth_descriptor",
    args: {
      op_name: opName,
      args,
      account_id: formatter.ensureBuffer(accountId),
      ad_ids: ids.map(formatter.ensureBuffer),
    },
  };
}

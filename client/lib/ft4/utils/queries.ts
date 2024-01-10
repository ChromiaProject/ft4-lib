import { DictPair, QueryObject, RawGtv } from "postchain-client";

export function rellAppStructure(): QueryObject<{
  modules: Record<string, DictPair>;
}> {
  return {
    name: "rell.get_app_structure",
    args: {},
  };
}

export function allAuthHandlers(): QueryObject<
  {
    name: string;
    flags: string[];
    dynamic: boolean;
  }[]
> {
  return {
    name: "ft4.get_all_auth_handlers",
    args: {},
  };
}

export function firstAllowedAuthDescriptor(
  opName: string,
  args: RawGtv,
  accountId: Buffer,
  ids: Buffer[],
): QueryObject<Buffer | null> {
  return {
    name: "ft4.get_first_allowed_auth_descriptor",
    args: {
      op_name: opName,
      args,
      account_id: accountId,
      ad_ids: ids,
    },
  };
}

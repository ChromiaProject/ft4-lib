import { DictPair, QueryObject } from "postchain-client";

export function rellAppStructure(): QueryObject<{
  modules: Record<string, DictPair>;
}> {
  return {
    name: "rell.get_app_structure",
    args: {},
  };
}

export function getAllAuthHandlersQuery(): QueryObject<
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

export function getAllowedAuthDescriptors(
  opName: string,
  ids: Buffer[],
): QueryObject<Buffer[]> {
  return {
    name: "ft4.get_allowed_auth_descriptors",
    args: {
      op_name: opName,
      ad_ids: ids,
    },
  };
}

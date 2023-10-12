import { DictPair, QueryObject } from "postchain-client";

export function rellAppStructure(): QueryObject<{
  modules: Record<string, DictPair>;
}> {
  return {
    name: "rell.get_app_structure",
  };
}

import { QueryObject } from "postchain-client";

interface Module {
  operations?: Record<string, unknown>;
}

export interface AppStructure {
  modules: Module[];
}

export function getAppStructureQuery(): QueryObject<null> {
  return {
    name: "rell.get_app_structure",
  };
}

import { QueryObject } from "postchain-client";

export interface RellModuleStructure {
  operations?: Record<string, unknown>;
}

export interface RellAppStructure {
  modules: Record<string, RellModuleStructure>;
}

export function rellAppStructure(): QueryObject<null> {
  return {
    name: "rell.get_app_structure",
  };
}

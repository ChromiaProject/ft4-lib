import { QueryObject } from "postchain-client";

export function rellAppStructure(): QueryObject<Record<string, never>> {
  return {
    name: "rell.get_app_structure",
    args: {},
  };
}

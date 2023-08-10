import { QueryObject } from "postchain-client";

export function rellAppStructure(): QueryObject<null> {
  return {
    name: "rell.get_app_structure",
  };
}

import { QueryObject } from "postchain-client";
import { RawLoginConfig } from "./types";

export function loginConfig(
  configName?: string,
): QueryObject<RawLoginConfig, { name?: string }> {
  return {
    name: "ft4.get_login_config",
    args: {
      name: configName,
    },
  };
}

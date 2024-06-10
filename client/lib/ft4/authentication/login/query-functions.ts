import { Queryable } from "postchain-client";
import { LoginConfig } from "./types";
import { loginConfig } from "./queries";
import { gtv } from "@ft4/accounts";
import { loginConfigRuleMapper } from "./rules";

/**
 * Fetches a login config. Either the config with the provided name
 * or, if omitted, the default config.
 * @param queryable - the client to use to fetch the config
 * @param configName - optional config name. If omitted, default config will be fetched
 */
export async function getLoginConfig(
  queryable: Queryable,
  configName?: string,
): Promise<LoginConfig> {
  const config = await queryable.query(loginConfig(configName));
  return {
    flags: config.flags,
    rules:
      config.rules && gtv.rulesFromGtv(config.rules, loginConfigRuleMapper),
  };
}

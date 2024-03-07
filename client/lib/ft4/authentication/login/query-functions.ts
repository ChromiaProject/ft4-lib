import { Queryable } from "postchain-client";
import { LoginConfig } from "./types";
import { loginConfig } from "./queries";
import { rulesFromGtv } from "@ft4/accounts/auth-descriptor/rules/gtv";
import { loginConfigRuleMapper } from "./rules";

export async function getLoginConfig(
  queryable: Queryable,
  configName?: string,
): Promise<LoginConfig> {
  const config = await queryable.query(loginConfig(configName));
  return {
    flags: config.flags,
    rules: config.rules && rulesFromGtv(config.rules, loginConfigRuleMapper),
  };
}

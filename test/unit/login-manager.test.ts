import { authDescriptorRuleToLoginConfigRule } from "@ft4/index";
import {
  and,
  blockHeight,
  blockTime,
  greaterOrEqual,
  greaterThan,
  lessThan,
  opCount,
} from "@ft4/accounts/auth-descriptor";

describe("Login manager", () => {
  it("converts ad rule to login config rule", async () => {
    const adRule = and(
      lessThan(opCount(5)),
      greaterThan(blockHeight(100)),
      greaterOrEqual(blockTime(12)),
    );

    const loginRule = authDescriptorRuleToLoginConfigRule(adRule);

    expect(loginRule).toEqual({
      operator: "and",
      rules: [
        { operator: "lt", variable: "op_count", value: "5" },
        { operator: "gt", variable: "block_height", value: "{100}" },
        { operator: "ge", variable: "block_time", value: "{12}" },
      ],
    });
  });
});

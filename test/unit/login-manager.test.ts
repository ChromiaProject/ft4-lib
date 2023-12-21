import { authDescriptorRuleToLoginConfigAndRule } from "@ft4/index";
import {
  blockHeight,
  blockTime,
  greaterOrEqual,
  greaterThan,
  lessThan,
  opCount,
} from "@ft4/accounts/auth-descriptor";

describe("Login manager", () => {
  it("converts ad rule to login config relative rules", async () => {
    const loginRule = authDescriptorRuleToLoginConfigAndRule(
      [
        lessThan(opCount(5)),
        greaterThan(blockHeight(100)),
        greaterOrEqual(blockTime(12)),
      ],
      [],
    );

    expect(loginRule).toEqual({
      operator: "and",
      rules: [
        { operator: "lt", variable: "op_count", value: "{5}" },
        { operator: "gt", variable: "block_height", value: "{100}" },
        { operator: "ge", variable: "block_time", value: "{12}" },
      ],
    });
  });
  it("converts ad rule to login config absolute rules", async () => {
    const loginRule = authDescriptorRuleToLoginConfigAndRule(
      [],
      [
        lessThan(opCount(5)),
        greaterThan(blockHeight(100)),
        greaterOrEqual(blockTime(12)),
      ],
    );

    expect(loginRule).toEqual({
      operator: "and",
      rules: [
        { operator: "lt", variable: "op_count", value: "5" },
        { operator: "gt", variable: "block_height", value: "100" },
        { operator: "ge", variable: "block_time", value: "12" },
      ],
    });
  });
  it("converts ad rule to login config mixed rules", async () => {
    const loginRule = authDescriptorRuleToLoginConfigAndRule(
      [greaterThan(blockHeight(100)), greaterOrEqual(blockTime(12))],
      [lessThan(opCount(5))],
    );

    expect(loginRule).toEqual({
      operator: "and",
      rules: [
        { operator: "gt", variable: "block_height", value: "{100}" },
        { operator: "ge", variable: "block_time", value: "{12}" },
        { operator: "lt", variable: "op_count", value: "5" },
      ],
    });
  });
});

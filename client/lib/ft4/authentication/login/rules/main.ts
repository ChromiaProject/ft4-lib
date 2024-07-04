import {
  AuthDescriptorComplexRule,
  AuthDescriptorRuleVariable,
  AuthDescriptorRules,
  AuthDescriptorSimpleRule,
  RawSimpleRule,
  RuleOperator,
} from "@ft4/accounts";
import {
  LoginConfigComplexRule,
  LoginConfigRelativeRuleVariable,
  LoginConfigRules,
  LoginConfigSimpleRule,
} from "./types";

import { enumValueFromString } from "@ft4/utils";

/**
 * Takes a login config simple rule and transforms it into an auth descriptor rule.
 * for example, ["lt", "relative_block_time", 1000] becomes ["lt", "block_time", Date.now()+1000]
 *
 * Only works with simple rules, so nothing that starts with ["and", ...] is supported
 *
 * @param rule - the simple rule which we want to ensure is an auth descriptor rule
 * @param getBlockHeight - a function that returns the current block height (with caching)
 * @returns the auth descriptor rule that corresponds to the rule passed in as argument
 */
export async function ensureAuthDescriptorRule(
  rule: LoginConfigSimpleRule,
  getBlockHeight: () => Promise<number>,
): Promise<AuthDescriptorSimpleRule> {
  let valueToAdd = 0;
  let variable: AuthDescriptorRuleVariable;

  switch (rule.variable) {
    case LoginConfigRelativeRuleVariable.RelativeBlockHeight:
      variable = AuthDescriptorRuleVariable.BlockHeight;
      valueToAdd = await getBlockHeight();
      break;
    case LoginConfigRelativeRuleVariable.RelativeBlockTime:
      variable = AuthDescriptorRuleVariable.BlockTime;
      valueToAdd = Date.now();
      break;
    default:
      variable = rule.variable;
  }

  return {
    operator: rule.operator,
    variable,
    value: rule.value + valueToAdd,
  };
}

/**
 * Maps list of login config rules to auth descriptor rules.
 *
 * For example,
 *  null =\> null
 *  lessThan(relativeBlockTime(10)) =\> lessThan(blockTime(Date.now()+10))
 *  lessThan(opCount(10)) =\> lessThan(opCount(10))
 *  lessThan(relativeBlockHeight(10)) =\> lessThan(blockHeight(currentBlockHeight+10))
 *  ["and", loginRule1, authDescRule2] =\> ["and", authDescRule1, authDescRule2]
 *
 * @param rules - a list of login config rules
 * @param getBlockHeight - a function which returns the current block height of the chain.
 * It allows caching
 * @returns a list of auth descriptor rules
 */
export async function mapLoginConfigRulesToAuthDescriptorRules(
  rules: LoginConfigRules | AuthDescriptorRules,
  getBlockHeight: () => Promise<number>,
): Promise<AuthDescriptorRules> {
  if (isSimpleRule(rules)) {
    return ensureAuthDescriptorRule(rules, getBlockHeight);
  } else {
    const simpleRules = (
      rules as LoginConfigComplexRule | AuthDescriptorComplexRule
    ).rules.map((rule) => ensureAuthDescriptorRule(rule, getBlockHeight));

    const result: AuthDescriptorRules = {
      operator: "and",
      rules: await Promise.all(simpleRules),
    };

    return result;
  }
}

function isSimpleRule(
  rule: LoginConfigRules | AuthDescriptorRules,
): rule is LoginConfigSimpleRule {
  return (rule as LoginConfigComplexRule).rules === undefined;
}

/**
 * Returns a value that represents `m` minutes. Can also be combined with the other
 * time functions in this module. For example:
 * ```
 * hours(2) + minutes(20) // Represents: "2 hours and 20 minutes"
 * ```
 * @param m - how many minutes to get
 * @remarks this function does not care in any way about leap seconds and any other time
 * adjustments. This means that when you define an auth descriptor with a rule that makes
 * it expire after 1 minute, it will expire after exactly 60 seconds, even if there has been
 * a leap second during that minute, which means it will be off by a second.
 */
export const minutes = (m: number) => m * 60000;
/**
 * Returns a value that represents `h` hours. Can also be combined with the other
 * time functions in this module. For example:
 * ```
 * hours(2) + minutes(20) // Represents: "2 hours and 20 minutes"
 * ```
 * @param h - how many hours to get
 * @remarks this function does not care in any way about leap seconds and any other time
 * adjustments. This means that when you define an auth descriptor with a rule that makes
 * it expire after 1 hour, it will expire after exactly 60 * 60 seconds, even if there has been
 * a leap second during that hour, which means it will be off by a second.
 */
export const hours = (h: number) => h * minutes(60);
/**
 * Returns a value that represents `d` days. Can also be combined with the other
 * time functions in this module. For example:
 * ```
 * days(2) + hours(10) // Represents: "2 days and 10 hours" or "34 hours"
 * ```
 * @param d - how many days to get
 * @remarks this function does not care in any way about leap seconds and any other time
 * adjustments. This means that when you define an auth descriptor with a rule that makes
 * it expire after 1 day, it will expire after exactly 24 hours, even if there has been
 * a leap second during that day, which means it will be off by a second.
 */
export const days = (d: number) => d * hours(24);
/**
 * Returns a value that represents `w` weeks. Can also be combined with the other
 * time functions in this module. For example:
 * ```
 * weeks(2) + days(3) // Represents: "2 weeks and 3 days"
 * ```
 * @param w - how weeks hours to get
 * @remarks this function does not care in any way about leap seconds and any other time
 * adjustments. This means that when you define an auth descriptor with a rule that makes
 * it expire after 1 week, it will expire after exactly 24 * 7 hours, even if there has been
 * a leap second during that week, which means it will be off by a second.
 */
export const weeks = (w: number) => w * days(7);

/**
 * Creates a login rule which represents "this rule will be valid for `ttl` seconds",
 * where `ttl` is the input to the function. Goes great with the functions for representing
 * time. E.g.,
 * ```
 * ttlLoginRule(30) // Valid for 30 seconds
 * ttlLoginRule(minutes(10)) // Valid for 10 minutes
 * ttlLoginRule(days(2)) // Valid for 2 days
 * ...
 * ```
 * @param ttl - for how long (in seconds) the rule is valid.
 */
export function ttlLoginRule(ttl: number): LoginConfigSimpleRule {
  return {
    operator: RuleOperator.LessThan,
    variable: LoginConfigRelativeRuleVariable.RelativeBlockTime,
    value: ttl,
  };
}

export function loginConfigRuleMapper(
  rule: RawSimpleRule,
): LoginConfigSimpleRule {
  return {
    operator: enumValueFromString(rule[0], RuleOperator),
    variable: enumValueFromString(rule[1], {
      ...LoginConfigRelativeRuleVariable,
      ...AuthDescriptorRuleVariable,
    }),
    value: rule[2],
  };
}

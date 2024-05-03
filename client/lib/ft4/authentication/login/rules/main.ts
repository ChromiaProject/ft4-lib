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

/*
 * Allows the user to specify a ttl value like this:
 * weeks(1)+days(3)
 * None of these functions care in any way about leap seconds and any other time adjustments
 * This means that when you define an auth descriptor with a rule that makes it expire after
 * 1 day, it will expire after exactly 24h, even if there has been a leap second during that
 * day, which means it will be off by a second (e.g. starts at 14:00:00 and expires the next
 * day at 13:59:59).
 */
export const minutes = (m: number) => m * 60000;
export const hours = (h: number) => h * minutes(60);
export const days = (d: number) => d * hours(24);
export const weeks = (w: number) => w * days(7);

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

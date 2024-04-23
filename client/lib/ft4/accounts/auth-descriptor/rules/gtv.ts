import { enumValueFromString } from "@ft4/utils";
import { isGtvSimpleRule, isSimpleRule } from "./type-predicates";
import {
  AuthDescriptorRuleVariable,
  AuthDescriptorRules,
  AuthDescriptorSimpleRule,
  ComplexRule,
  RawRules,
  RawSimpleRule,
  RuleOperator,
  SimpleRule,
} from "./types";

export function authDescriptorRuleMapper(
  rule: RawSimpleRule,
): AuthDescriptorSimpleRule {
  return {
    operator: enumValueFromString(rule[0], RuleOperator),
    variable: enumValueFromString(rule[1], AuthDescriptorRuleVariable),
    value: rule[2],
  };
}

export function rulesFromGtv<T extends string>(
  gtvRules: RawRules,
  mapRule: (rule: RawSimpleRule) => SimpleRule<T>,
): ComplexRule<T> | SimpleRule<T> {
  if (isGtvSimpleRule(gtvRules)) {
    return mapRule(gtvRules);
  } else {
    return {
      operator: "and",
      rules: gtvRules.slice(1).map((v) => mapRule(v as RawSimpleRule)),
    };
  }
}

export function rulesToGtv(rule: AuthDescriptorRules): RawRules {
  const toGtv = (rule: AuthDescriptorSimpleRule): RawSimpleRule => [
    rule.operator,
    rule.variable,
    rule.value,
  ];

  if (isSimpleRule(rule)) {
    return toGtv(rule);
  }

  return ["and", ...rule.rules.map(toGtv)];
}

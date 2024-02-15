// ======== Client side data model ============

import { RuleOperator } from "./operators";
import { AuthDescriptorRuleVariable } from "./variables";

export type SimpleRule<T extends string> = {
  variable: T;
  operator: RuleOperator;
  value: number;
};

export type ComplexRule<T extends string> = {
  operator: "and";
  rules: SimpleRule<T>[];
};

export type AuthDescriptorSimpleRule = SimpleRule<AuthDescriptorRuleVariable>;

export type AuthDescriptorComplexRule = ComplexRule<AuthDescriptorRuleVariable>;

export type AuthDescriptorRules =
  | AuthDescriptorSimpleRule
  | AuthDescriptorComplexRule;

export type RawSimpleRule = readonly [string, string, number];
export type RawComplexRule = readonly ["and", ...RawSimpleRule[]];

export type RawRules = RawSimpleRule | RawComplexRule;

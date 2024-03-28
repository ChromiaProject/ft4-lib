// ======== Client side data model ============

export enum AuthDescriptorRuleVariable {
  BlockHeight = "block_height",
  BlockTime = "block_time",
  OpCount = "op_count",
}

export type RuleVariableValue<T extends string> = [T, number];

export enum RuleOperator {
  LessThan = "lt",
  LessOrEqual = "le",
  Equals = "eq",
  GreaterThan = "gt",
  GreaterOrEqual = "ge",
}

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

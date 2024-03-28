import {
  AuthDescriptorRuleVariable,
  ComplexRule,
  SimpleRule,
} from "@ft4/accounts";

export enum LoginConfigRelativeRuleVariable {
  RelativeBlockHeight = "relative_block_height",
  RelativeBlockTime = "relative_block_time",
}

export type LoginConfigRuleVariable =
  | LoginConfigRelativeRuleVariable
  | AuthDescriptorRuleVariable;

export type LoginConfigSimpleRule = SimpleRule<LoginConfigRuleVariable>;
export type LoginConfigComplexRule = ComplexRule<LoginConfigRuleVariable>;

export type LoginConfigRules = LoginConfigSimpleRule | LoginConfigComplexRule;

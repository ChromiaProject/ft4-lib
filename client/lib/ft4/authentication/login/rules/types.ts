import {
  AuthDescriptorRuleVariable,
  ComplexRule,
  SimpleRule,
} from "@ft4/accounts/auth-descriptor/rules";

export enum LoginConfigRelativeRuleVariable {
  RelativeBlockHeight = "relative_block_height",
  RelativeBlockTime = "relative_block_time",
}

export type LoginConfigSimpleRule = SimpleRule<LoginConfigRuleVariable>;
export type LoginConfigComplexRule = ComplexRule<LoginConfigRuleVariable>;

export type LoginConfigRuleVariable =
  | LoginConfigRelativeRuleVariable
  | AuthDescriptorRuleVariable;

export type LoginConfigRules = LoginConfigSimpleRule | LoginConfigComplexRule;

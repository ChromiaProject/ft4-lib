import { ComplexRule, SimpleRule } from "@ft4/accounts/auth-descriptor/rules";
import { LoginConfigRuleVariable } from "./variables";

export type LoginConfigSimpleRule = SimpleRule<LoginConfigRuleVariable>;
export type LoginConfigComplexRule = ComplexRule<LoginConfigRuleVariable>;

export type LoginConfigRules = LoginConfigComplexRule | LoginConfigSimpleRule;

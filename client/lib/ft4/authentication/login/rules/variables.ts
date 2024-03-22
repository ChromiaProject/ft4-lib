import { RuleVariableValue } from "@ft4/accounts/auth-descriptor/rules";
import {
  LoginConfigRelativeRuleVariable,
  LoginConfigRuleVariable,
} from "./types";

export const relativeBlockHeight = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRelativeRuleVariable.RelativeBlockHeight,
  value,
];

export const relativeBlockTime = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRelativeRuleVariable.RelativeBlockTime,
  value,
];

import { RuleVariableValue } from "@ft4/accounts/auth-descriptor/rules";
import { LoginConfigComplexRule, LoginConfigSimpleRule } from "./types";

export enum LoginConfigRuleVariable {
  BlockHeight = "block_height",
  BlockTime = "block_time",
  OpCount = "op_count",
  RelativeBlockHeight = "relative_block_height",
  RelativeBlockTime = "relative_block_time",
}

/**
 * Creates a block height rule variable object that can be passed
 * into a function that produces a rule
 * @param value the block height to use
 * @returns rule variable value
 */
export const blockHeight = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRuleVariable.BlockHeight,
  value,
];

export const relativeBlockHeight = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRuleVariable.RelativeBlockHeight,
  value,
];

/**
 * Creates a block time rule variable object that can be passed
 * into a function that produces a rule
 * @param value the block time to use
 * @returns rule variable value
 */
export const blockTime = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRuleVariable.BlockTime,
  value,
];

export const relativeBlockTime = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRuleVariable.RelativeBlockTime,
  value,
];

/**
 * Creates an operation count rule variable object that can be passed
 * into a function that produces a rule
 * @param value the operation count to use
 * @returns rule variable value
 */
export const opCount = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRuleVariable.OpCount,
  value,
];

export const and = (
  ...rules: LoginConfigSimpleRule[]
): LoginConfigComplexRule => {
  return {
    operator: "and",
    rules,
  };
};

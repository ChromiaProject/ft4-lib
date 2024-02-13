import { RuleVariableValue } from "./operators";

export enum AuthDescriptorRuleVariable {
  BlockHeight = "block_height",
  BlockTime = "block_time",
  OpCount = "op_count",
}

/**
 * Creates a block height rule variable object that can be passed
 * into a function that produces a rule
 * @param value the block height to use
 * @returns rule variable value
 */
export const blockHeight = (
  value: number,
): RuleVariableValue<AuthDescriptorRuleVariable> => [
  AuthDescriptorRuleVariable.BlockHeight,
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
): RuleVariableValue<AuthDescriptorRuleVariable> => [
  AuthDescriptorRuleVariable.BlockTime,
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
): RuleVariableValue<AuthDescriptorRuleVariable> => [
  AuthDescriptorRuleVariable.OpCount,
  value,
];

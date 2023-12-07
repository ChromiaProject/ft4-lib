import {
  AuthDescriptorSimpleRule,
  AuthDescriptorComplexRule,
  RuleOperator,
  RuleVariable,
  AuthDescriptorRules,
} from "./types";

type RuleVariableValue = [RuleVariable, number];

/**
 * Creates a block height rule variable object that can be passed
 * into a function that produces a rule
 * @param value the block height to use
 * @returns rule variable value
 */
export const blockHeight = (value: number): RuleVariableValue => [
  RuleVariable.BlockHeight,
  value,
];

/**
 * Creates a block time rule variable object that can be passed
 * into a function that produces a rule
 * @param value the block time to use
 * @returns rule variable value
 */
export const blockTime = (value: number): RuleVariableValue => [
  RuleVariable.BlockTime,
  value,
];

/**
 * Creates an operation count rule variable object that can be passed
 * into a function that produces a rule
 * @param value the operation count to use
 * @returns rule variable value
 */
export const opCount = (value: number): RuleVariableValue => [
  RuleVariable.OpCount,
  value,
];

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "less than" (<) operation for the provided variable.
 * Example: lessThan(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const lessThan = (
  ...variableValue: RuleVariableValue | [RuleVariableValue]
): AuthDescriptorSimpleRule =>
  produceRule(RuleOperator.LessThan, ...variableValue);

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "less than or equal" (<=) operation for the provided variable.
 * Example: lessOrEqual(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const lessOrEqual = (
  ...variableValue: RuleVariableValue | [RuleVariableValue]
): AuthDescriptorSimpleRule =>
  produceRule(RuleOperator.LessOrEqual, ...variableValue);

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "equal" (=) operation for the provided variable.
 * Example: equals(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const equals = (
  ...variableValue: RuleVariableValue | [RuleVariableValue]
): AuthDescriptorSimpleRule =>
  produceRule(RuleOperator.Equals, ...variableValue);

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "greater than" (>) operation for the provided variable.
 * Example: greaterThan(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const greaterThan = (
  ...variableValue: RuleVariableValue | [RuleVariableValue]
): AuthDescriptorSimpleRule =>
  produceRule(RuleOperator.GreaterThan, ...variableValue);

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "greater than or equal" (>=) operation for the provided variable.
 * Example: greaterOrEqual(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const greaterOrEqual = (
  ...variableValue: RuleVariableValue | [RuleVariableValue]
): AuthDescriptorSimpleRule =>
  produceRule(RuleOperator.GreaterOrEqual, ...variableValue);

/**
 * Creates a combination of rules that will be evaluated using the equivalent of a boolean 'and' operator.
 * I.e., for the expression returned by this function to be true, all of the provided rules must evaluate
 * to true as well, the rules will be evaluated in the same order as they are provided and will short circuit
 * if any rule evaluates to false.
 *
 * The object that is returned from this function can be used when creating an auth descriptor.
 *
 * Example:
 * ```
 *  and(
 *    greaterThan(blockHeight(50)),
 *    lessThan(blockHeight(10)),
 *  )
 * ```
 * @param rules the rules to combine
 * @returns a set of rules which will be evaluated together using the 'and' operator
 */
export const and = (
  ...rules: AuthDescriptorRules[]
): AuthDescriptorComplexRule => {
  return {
    operator: "and",
    rules,
  };
};

const produceRule = (
  operator: RuleOperator,
  ...variableValue: RuleVariableValue | [RuleVariableValue]
): AuthDescriptorSimpleRule => {
  const isNested = (
    variableValue: RuleVariableValue | [RuleVariableValue],
  ): variableValue is [RuleVariableValue] => Array.isArray(variableValue[0]);
  if (isNested(variableValue)) {
    return {
      operator,
      variable: variableValue[0][0],
      value: variableValue[0][1],
    };
  } else {
    return { operator, variable: variableValue[0], value: variableValue[1] };
  }
};

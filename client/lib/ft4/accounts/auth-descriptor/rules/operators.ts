import { ComplexRule, SimpleRule } from "./types";

export type RuleVariableValue<T extends string> = [T, number];

export enum RuleOperator {
  LessThan = "lt",
  LessOrEqual = "le",
  Equals = "eq",
  GreaterThan = "gt",
  GreaterOrEqual = "ge",
}

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "less than" (<) operation for the provided variable.
 * Example: lessThan(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const lessThan = <T extends string>(
  ...variableValue: RuleVariableValue<T> | [RuleVariableValue<T>]
): SimpleRule<T> => produceRule(RuleOperator.LessThan, ...variableValue);

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "less than or equal" (<=) operation for the provided variable.
 * Example: lessOrEqual(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const lessOrEqual = <T extends string>(
  ...variableValue: RuleVariableValue<T> | [RuleVariableValue<T>]
): SimpleRule<T> => produceRule(RuleOperator.LessOrEqual, ...variableValue);

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "equal" (=) operation for the provided variable.
 * Example: equals(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const equals = <T extends string>(
  ...variableValue: RuleVariableValue<T> | [RuleVariableValue<T>]
): SimpleRule<T> => produceRule(RuleOperator.Equals, ...variableValue);

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "greater than" (>) operation for the provided variable.
 * Example: greaterThan(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const greaterThan = <T extends string>(
  ...variableValue: RuleVariableValue<T> | [RuleVariableValue<T>]
): SimpleRule<T> => produceRule(RuleOperator.GreaterThan, ...variableValue);

/**
 * Creates a rule variable that (can be passed to an auth descriptor) with
 * the "greater than or equal" (>=) operation for the provided variable.
 * Example: greaterOrEqual(opCount(10))
 * @param variableValue the variable value to use
 * @returns a rule variable
 */
export const greaterOrEqual = <T extends string>(
  ...variableValue: RuleVariableValue<T> | [RuleVariableValue<T>]
): SimpleRule<T> => produceRule(RuleOperator.GreaterOrEqual, ...variableValue);

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
export const and = <T extends string>(
  ...rules: SimpleRule<T>[]
): ComplexRule<T> => {
  return {
    operator: "and",
    rules,
  };
};

function produceRule<T extends string>(
  operator: RuleOperator,
  ...variableValue: RuleVariableValue<T> | [RuleVariableValue<T>]
): SimpleRule<T> {
  const isNested = (
    variableValue: RuleVariableValue<T> | [RuleVariableValue<T>],
  ): variableValue is [RuleVariableValue<T>] => Array.isArray(variableValue[0]);

  if (isNested(variableValue)) {
    return {
      operator,
      variable: variableValue[0][0] as T,
      value: variableValue[0][1],
    };
  } else {
    return {
      operator,
      variable: variableValue[0] as T,
      value: variableValue[1],
    };
  }
}

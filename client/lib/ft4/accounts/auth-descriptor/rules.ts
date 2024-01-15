import { BufferId } from "@ft4/utils/types";
import {
  AuthDescriptorSimpleRule,
  AuthDescriptorComplexRule,
  RuleOperator,
  RuleVariable,
  AuthDescriptorRules,
  AnyAuthDescriptor,
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

/**
 * Returns whether the given auth descriptor's rules are active, that is whether they
 * have already all been triggered at least once.
 * An inactive auth descriptor will be active in the future, while an active one might
 * be active or have already expired. Use `hasExpired` to check for this case.
 * @param authDescriptor the auth descriptor to check
 * @param getBlockHeight an async function that returns the current block height.
 * This allows caching.
 */
export async function isActive(
  authDescriptor: AnyAuthDescriptor,
  getBlockHeight: () => Promise<number>,
): Promise<boolean> {
  if (authDescriptor.rules === null) return true;

  const isRuleActive = async (rule: AuthDescriptorSimpleRule) => {
    if (
      rule.operator === RuleOperator.LessOrEqual ||
      rule.operator === RuleOperator.LessThan ||
      rule.variable === RuleVariable.OpCount
    ) {
      // these rules are always valid
      return true;
    }

    let variable;
    if (rule.variable === RuleVariable.BlockHeight) {
      variable = await getBlockHeight();
    } else {
      variable = Date.now();
    }

    if (
      rule.operator === RuleOperator.Equals ||
      rule.operator === RuleOperator.GreaterOrEqual
    ) {
      return variable >= rule.value;
    } else {
      return variable > rule.value;
    }
  };

  if (authDescriptor.rules.operator === "and") {
    return (
      await Promise.all(authDescriptor.rules.rules.map(isRuleActive))
    ).every(Boolean);
  } else {
    return await isRuleActive(authDescriptor.rules);
  }
}

/**
 * Returns whether the given auth descriptor's rules have expired, that is whether it will
 * no longer ever be usable. Inactive descriptors never return true.
 * @param authDescriptor the auth descriptor to check
 * @param getBlockHeight an async function that returns the current block height.
 * This allows caching.
 * @param getNonce an async function that returns the current nonce for the given descriptor.
 * This allows caching.
 */
export async function hasExpired(
  authDescriptor: AnyAuthDescriptor,
  getBlockHeight: () => Promise<number>,
  getNonce: (authDescriptorId: BufferId) => Promise<number | null>,
): Promise<boolean> {
  if (authDescriptor.rules === null) return false;

  const hasRuleExpired = async (rule: AuthDescriptorSimpleRule) => {
    if (
      rule.operator === RuleOperator.GreaterOrEqual ||
      rule.operator === RuleOperator.GreaterThan
    ) {
      // these rules never expire
      return false;
    }

    let variable;
    if (rule.variable === RuleVariable.BlockHeight) {
      variable = await getBlockHeight();
    } else if (rule.variable === RuleVariable.BlockTime) {
      variable = Date.now();
    } else {
      try {
        variable = (await getNonce(authDescriptor.id)) || 0;
      } catch (e) {
        // auth descriptor expired and was eliminated on rell side
        return true;
      }
    }

    if (
      rule.operator === RuleOperator.Equals ||
      rule.operator === RuleOperator.LessOrEqual
    ) {
      return variable > rule.value;
    } else {
      return variable >= rule.value;
    }
  };

  if (authDescriptor.rules.operator === "and") {
    return (
      await Promise.all(authDescriptor.rules.rules.map(hasRuleExpired))
    ).some(Boolean);
  } else {
    return await hasRuleExpired(authDescriptor.rules);
  }
}

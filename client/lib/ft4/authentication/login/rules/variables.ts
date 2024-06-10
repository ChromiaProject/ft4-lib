import { RuleVariableValue } from "@ft4/accounts";
import {
  LoginConfigRelativeRuleVariable,
  LoginConfigRuleVariable,
} from "./types";

/**
 * Creates a login config rule variable of type relative block height
 * which will expire after `value` number of blocks after this was registered.
 * @param value - after how many blocks this rule should expire
 */
export const relativeBlockHeight = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRelativeRuleVariable.RelativeBlockHeight,
  value,
];

/**
 * Creates a login config rule variable of type relative block time
 * which will expire after `value` number of seconds after this was registered.
 * Works well together with the time functions of this module. E.g.,
 * ```
 * relativeBlockTime(hours(2)) // Expires after two hours
 * ```
 * @param value - after how many seconds this rule should expire
 */
export const relativeBlockTime = (
  value: number,
): RuleVariableValue<LoginConfigRuleVariable> => [
  LoginConfigRelativeRuleVariable.RelativeBlockTime,
  value,
];

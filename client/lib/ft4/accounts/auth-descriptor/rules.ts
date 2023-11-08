import { RuleVariable } from "./types";

type RuleVariableValue = [RuleVariable, number];

export const blockHeight = (value: number): RuleVariableValue => [
  RuleVariable.BlockHeight,
  value,
];
export const blockTime = (value: number): RuleVariableValue => [
  RuleVariable.BlockTime,
  value,
];
export const opCount = (value: number): RuleVariableValue => [
  RuleVariable.OpCount,
  value,
];

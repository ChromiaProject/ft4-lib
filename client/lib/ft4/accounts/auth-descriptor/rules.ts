import { AuthDescriptorRule } from "./types";

export enum RuleVariables {
  BlockHeight = 0,
  BlockTime = 1,
  OpCount = 2,
}

export enum RuleOperator {
  LessThan = 0,
  LessOrEqual = 1,
  Equals = 2,
  GreaterThen = 3,
  GreaterOrEqual = 4,
}

export const allow = {
  ...chooseVariable(),
  all: null,
};

function chooseOperator(start: any[], variable: number) {
  return {
    lessThan: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [RuleOperator.LessThan, variable, value]]
          : ["and", start, [RuleOperator.LessThan, variable, value]]
        : [RuleOperator.LessThan, variable, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },

    lessOrEqual: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [RuleOperator.LessOrEqual, variable, value]]
          : ["and", start, [RuleOperator.LessOrEqual, variable, value]]
        : [RuleOperator.LessOrEqual, variable, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },

    equals: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [RuleOperator.Equals, variable, value]]
          : ["and", start, [RuleOperator.Equals, variable, value]]
        : [RuleOperator.Equals, variable, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },

    greaterOrEqual: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [RuleOperator.GreaterOrEqual, variable, value]]
          : ["and", start, [RuleOperator.GreaterOrEqual, variable, value]]
        : [RuleOperator.GreaterOrEqual, variable, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },

    greaterThan: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [RuleOperator.GreaterThen, variable, value]]
          : ["and", start, [RuleOperator.GreaterThen, variable, value]]
        : [RuleOperator.GreaterThen, variable, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },
  };
}

function chooseVariable(start?) {
  return {
    blockHeight: chooseOperator(start, RuleVariables.BlockHeight),
    blockTime: chooseOperator(start, RuleVariables.BlockTime),
    operationCount: chooseOperator(start, RuleVariables.OpCount),
  };
}

//const exampleUsage = allow.blockHeight.equals(3).and.blockTime.lessOrEqual(2).only

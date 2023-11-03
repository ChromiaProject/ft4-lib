import { AuthDescriptorRule } from "./types";

enum RuleVariables {
  BlockHeight = 0,
  BlockTime = 1,
  OpCount = 2,
}

enum RuleOperator {
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
          ? [...start, [variable, RuleOperator.LessThan, value]]
          : ["and", start, [variable, RuleOperator.LessThan, value]]
        : [variable, RuleOperator.LessThan, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },

    lessOrEqual: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [variable, RuleOperator.LessOrEqual, value]]
          : ["and", start, [variable, RuleOperator.LessOrEqual, value]]
        : [variable, RuleOperator.LessOrEqual, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },

    equals: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [variable, RuleOperator.Equals, value]]
          : ["and", start, [variable, RuleOperator.Equals, value]]
        : [variable, RuleOperator.Equals, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },

    greaterOrEqual: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [variable, RuleOperator.GreaterOrEqual, value]]
          : ["and", start, [variable, RuleOperator.GreaterOrEqual, value]]
        : [variable, RuleOperator.GreaterOrEqual, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable(current),
      };
    },

    greaterThan: (value: number) => {
      const current = start
        ? start[0] === "and"
          ? [...start, [variable, RuleOperator.GreaterThen, value]]
          : ["and", start, [variable, RuleOperator.GreaterThen, value]]
        : [variable, RuleOperator.GreaterThen, value];
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

import { AuthDescriptorRule } from "./types";

enum RuleVariables {
  BlockHeight = "block_height",
  BlockTime = "block_time",
  OpCount = "op_count",
}

enum RuleOperator {
  LessThan = "lt",
  LessOrEqual = "le",
  Equals = "eq",
  GreaterThen = "gt",
  GreaterOrEqual = "ge",
}

export const allow = {
  ...chooseVariable(),
  all: null,
};

function chooseOperator(start: any[], variable: string) {
  return {
    lessThan: (value: number) => {
      const current = start
        ? start.concat([[variable, RuleOperator.LessThan, value]])
        : [variable, RuleOperator.LessThan, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable([current, "and"]),
      };
    },

    lessOrEqual: (value: number) => {
      const current = start
        ? [start].concat([[variable, RuleOperator.LessOrEqual, value]])
        : [variable, RuleOperator.LessOrEqual, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable([current, "and"]),
      };
    },

    equals: (value: number) => {
      const current = start
        ? start.concat([[variable, RuleOperator.Equals, value]])
        : [variable, RuleOperator.Equals, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable([current, "and"]),
      };
    },

    greaterOrEqual: (value: number) => {
      const current = start
        ? start.concat([[variable, RuleOperator.GreaterOrEqual, value]])
        : [variable, RuleOperator.GreaterOrEqual, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable([current, "and"]),
      };
    },

    greaterThan: (value: number) => {
      const current = start
        ? start.concat([[variable, RuleOperator.GreaterThen, value]])
        : [variable, RuleOperator.GreaterThen, value];
      return {
        only: <AuthDescriptorRule>Object.freeze(current),
        and: chooseVariable([current, "and"]),
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

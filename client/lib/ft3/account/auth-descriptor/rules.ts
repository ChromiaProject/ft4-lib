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
  ...chooseVariable([]),
  all: null,
};

function chooseOperator(start: (string | number)[]) {
  return {
    lessThan: (value: number) => {
      const current = [...start, RuleOperator.LessThan, value];
      return {
        only: Object.freeze(current),
        and: chooseVariable([...current, "and"]),
      };
    },

    lessOrEqual: (value: number) => {
      const current = [...start, RuleOperator.LessOrEqual, value];
      return {
        only: Object.freeze(current),
        and: chooseVariable([...current, "and"]),
      };
    },

    equals: (value: number) => {
      const current = [...start, RuleOperator.Equals, value];
      return {
        only: Object.freeze(current),
        and: chooseVariable([...current, "and"]),
      };
    },

    greaterOrEqual: (value: number) => {
      const current = [...start, RuleOperator.GreaterOrEqual, value];
      return {
        only: Object.freeze(current),
        and: chooseVariable([...current, "and"]),
      };
    },

    greaterThan: (value: number) => {
      const current = [...start, RuleOperator.GreaterThen, value];
      return {
        only: Object.freeze(current),
        and: chooseVariable([...current, "and"]),
      };
    },
  };
}

function chooseVariable(start: (string | number)[]) {
  return {
    blockHeight: chooseOperator([...start, RuleVariables.BlockHeight]),
    blockTime: chooseOperator([...start, RuleVariables.BlockTime]),
    operationCount: chooseOperator([...start, RuleVariables.OpCount]),
  };
}

//const exampleUsage = allow.blockHeight.equals(3).and.blockTime.lessOrEqual(2).only

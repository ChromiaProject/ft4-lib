import {
  AuthDescriptorError,
  RuleOperator,
  RuleVariable,
  AuthType,
} from "./types";

export function ruleVariableFromString(str: string): RuleVariable {
  const enumValues = Object.values(RuleVariable);
  for (const value of enumValues) {
    if (value === str) {
      return value;
    }
  }
  throw new AuthDescriptorError(`No rule variable named: '${str}'`);
}

export function ruleOperatorFromString(str: string): RuleOperator {
  const enumValues = Object.values(RuleOperator);
  for (const value of enumValues) {
    if (value === str) {
      return value;
    }
  }
  throw new AuthDescriptorError(`No rule operator named: '${str}'`);
}

export function authTypeFromString(str: string): AuthType {
  const enumValues = Object.values(AuthType);
  for (const value of enumValues) {
    if (value === str) {
      return value;
    }
  }
  throw new AuthDescriptorError(`No auth type named: '${str}'`);
}

function serializationMap<T extends string | number>(
  v: T[],
): Record<number, T> {
  return v
    .map((value, i) => [value, i])
    .reduce(
      (acc, curr) => ({ ...acc, [curr[0]]: curr[1] }),
      {} as Record<number, T>,
    );
}

function deserializationMap<T extends string | number>(
  v: T[],
): Record<T, number> {
  return v
    .map((value, i) => [i, value])
    .reduce(
      (acc, curr) => ({ ...acc, [curr[0]]: curr[1] }),
      {} as Record<T, number>,
    );
}

const authTypeSerializationMap = serializationMap(Object.values(AuthType));
const authTypeDeserializationMap = deserializationMap(Object.values(AuthType));

export const serializeAuthType = (type: AuthType): number =>
  authTypeSerializationMap[type];
export const deserializeAuthType = (i: number): AuthType =>
  authTypeDeserializationMap[i];

const ruleVariableSerializationMap = serializationMap(
  Object.values(RuleVariable),
);
const ruleVariableDeserializationMap = deserializationMap(
  Object.values(RuleVariable),
);
export const serializeRuleVariable = (variable: RuleVariable) =>
  ruleVariableSerializationMap[variable];
export const deserializeRuleVariable = (i: number) =>
  ruleVariableDeserializationMap[i];

const ruleOperatorSerializationMap = serializationMap(
  Object.values(RuleOperator),
);
const ruleOperatorDeserializationMap = deserializationMap(
  Object.values(RuleOperator),
);
export const serializeRuleOperator = (operator: RuleOperator) =>
  ruleOperatorSerializationMap[operator];
export const deserializeRuleOperator = (i: number) =>
  ruleOperatorDeserializationMap[i];

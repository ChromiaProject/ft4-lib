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
      return RuleVariable[value];
    }
  }
  throw new AuthDescriptorError(`No rule variable named: '${str}'`);
}

export function ruleOperatorFromString(str: string): RuleOperator {
  const enumValues = Object.values(RuleOperator);
  for (const value of enumValues) {
    if (value === str) {
      return RuleOperator[value];
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

const authTypeSerializationMap = Object.values(AuthType)
  .map((value, i) => [value, i])
  .reduce((acc, curr) => ({ ...acc, [curr[0]]: curr[1] }), {});
const authTypeDeserializationMap = Object.values(AuthType)
  .map((value, i) => [i, value])
  .reduce((acc, curr) => ({ ...acc, [curr[0]]: curr[1] }), {});

export function serializeAuthType(type: AuthType): any {
  return authTypeSerializationMap[type];
}

export function deserializeAuthType(i: number): AuthType {
  return authTypeDeserializationMap[i];
}

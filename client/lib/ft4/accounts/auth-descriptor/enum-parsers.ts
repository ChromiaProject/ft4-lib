import { AuthDescriptorError, AuthType, EnumLike } from "./types";

export function enumValueFromString<T extends EnumLike>(
  str: string,
  enumType: T,
): T[keyof T] {
  const enumValues = Object.values(enumType);
  for (const value of enumValues) {
    if (value === str) {
      return value as T[keyof T];
    }
  }
  throw new AuthDescriptorError(`No enum value named: '${str}'`);
}

const authTypeSerializationMap = Object.values(AuthType)
  .map((value, i) => [value, i])
  .reduce((acc, curr) => ({ ...acc, [curr[0]]: curr[1] }), {});
const authTypeDeserializationMap = Object.values(AuthType)
  .map((value, i) => [i, value])
  .reduce((acc, curr) => ({ ...acc, [curr[0]]: curr[1] }), {});
export function serializeAuthType(type: AuthType): number {
  return authTypeSerializationMap[type];
}
export function deserializeAuthType(i: number): AuthType {
  return authTypeDeserializationMap[i];
}

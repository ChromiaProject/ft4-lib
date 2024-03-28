import { EnumLike } from "./types";

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
  throw new Error(`No enum value named: '${str}'`);
}

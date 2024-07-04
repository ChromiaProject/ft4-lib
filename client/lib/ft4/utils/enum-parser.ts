import { EnumLike } from "./types";

/**
 * Creates an enum instance from a string value. Throws an error if the provided
 * enum does not have a value that matches the string.
 * @param str - the string value
 * @param enumType - the enum type in which the string is a value
 */
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

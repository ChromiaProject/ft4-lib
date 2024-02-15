import { AuthType } from "./types";

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

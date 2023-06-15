import { encryption } from "postchain-client";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { Config, Operation } from "./types";
import { RawGtv } from "postchain-client/built/src/gtv/types";

export function nop(): Operation {
  return ["nop", encryption.randomBytes(32)];
}

export function op(
  name: string,
  ...args: DeepReadonly<RawGtv>[]
): Operation {
  return [name, ...(args as RawGtv[])];
}

export async function getConfig(session: GtxClient): Promise<Config> {
  return Object.freeze(await session.query("ft3.get_config"));
}

export async function getVersion(session: GtxClient): Promise<string> {
  return Object.freeze(await session.query("ft3.get_version"));
}

type DeepReadonly<T> =
  T extends (infer R)[] ? DeepReadonlyArray<R> :
  T extends object ? DeepReadonlyObject<T> :
  T;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};
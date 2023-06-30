import {
  Operation as newOperation,
  encryption,
  GtxClient,
  QueryArguments,
  RawGtv,
  IClient,
} from "postchain-client";
import { Config, Operation } from "./types";

export function nop(): Operation {
  return ["nop", encryption.randomBytes(32)];
}

export function op(name: string, ...args: DeepReadonly<RawGtv>[]): Operation {
  return [name, ...(args as RawGtv[])];
}

export function _nop(): newOperation {
  return { name: "nop", args: [encryption.randomBytes(32)] };
}

export function _op(
  name: string,
  ...args: DeepReadonly<RawGtv>[]
): newOperation {
  return { name, args: args as RawGtv[] };
}

export async function getConfig(session: GtxClient): Promise<Config> {
  return Object.freeze(await session.query("ft4.get_config"));
}

export async function _getConfig(session: IClient): Promise<Config> {
  return Object.freeze(
    await session.query<QueryArguments, Config>("ft4.get_config")
  );
}

export async function getVersion(session: IClient): Promise<string> {
  return Object.freeze(
    await session.query<QueryArguments, string>("ft4.get_version")
  );
}

type DeepReadonly<T> = T extends (infer R)[]
  ? DeepReadonlyArray<R>
  : T extends object
  ? DeepReadonlyObject<T>
  : T;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

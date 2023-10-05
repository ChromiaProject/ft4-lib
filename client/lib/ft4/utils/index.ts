import {
  Operation as newOperation,
  encryption,
  RawGtv,
  IClient,
} from "postchain-client";
import { Config } from "./types";

export function nop(): newOperation {
  return { name: "nop", args: [encryption.randomBytes(32)] };
}

export function op(name: string, ...args: readonly RawGtv[]): newOperation {
  return { name, args: args as RawGtv[] };
}

export async function getConfig(session: IClient): Promise<Config> {
  const response = await session.query<ConfigResponse>("ft4.get_config");
  return Object.freeze({
    rateLimit: {
      active: response.rate_limit.active,
      maxPoints: response.rate_limit.max_points,
      recoveryTime: response.rate_limit.recovery_time,
      pointsAtAccountCreation: response.rate_limit.points_at_account_creation,
    },
  });
}

export async function getVersion(session: IClient): Promise<string> {
  return Object.freeze(await session.query<string>("ft4.get_version"));
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

type ConfigResponse = {
  rate_limit: {
    active: 0 | 1;
    max_points: number;
    recovery_time: number;
    points_at_account_creation: number;
  };
};

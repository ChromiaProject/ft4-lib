import {
  Operation,
  encryption,
  RawGtv,
  IClient,
  KeyPair,
  gtv,
  RawGtx,
} from "postchain-client";
import { Config } from "./types";
import { Buffer } from "buffer";

export function nop(): Operation {
  return { name: "nop", args: [encryption.randomBytes(32)] };
}

export function op(name: string, ...args: readonly RawGtv[]): Operation {
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

export function getTransactionRid(tx: RawGtx): Buffer {
  return gtv.gtvHash(tx[0]); //tx body
}

export async function getVersion(session: IClient): Promise<string> {
  return Object.freeze(await session.query<string>("ft4.get_version"));
}

export function getPubkey(keyPair: KeyPair): Buffer {
  return keyPair.pubKey ?? encryption.createPublicKey(keyPair.privKey);
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

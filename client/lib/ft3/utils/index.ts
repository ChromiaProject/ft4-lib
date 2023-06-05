import { encryption } from "postchain-client";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { GtvCompatible, encodeGtv } from "./gtv";
import { Config, Operation } from "./types";

export function nop(): Operation {
  return ["nop", encryption.randomBytes(32)];
}

export function op(
  name: string,
  ...args: Array<GtvCompatible | null>
): Operation {
  return [name, ...args.map((a) => encodeGtv(a))];
}

export async function getLastTimestamp(session: GtxClient): Promise<number> {
  return await session.query("ft3.get_last_timestamp");
}

export async function getConfig(session: GtxClient): Promise<Config> {
  return Object.freeze(await session.query("ft3.get_config"));
}

export async function getVersion(session: GtxClient): Promise<string> {
  return Object.freeze(await session.query("ft3.get_version"));
}

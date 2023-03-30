import { encryption } from "postchain-client";
import {
  GtxClient,
  Itransaction,
} from "postchain-client/built/src/gtx/interfaces";
import { GtvCompatible } from "./gtv";
import { ChainInfo, Operation } from "./types";

export function nop(): Operation {
  return ["nop", [encryption.randomBytes(32)]];
}

export function op(
  name: string,
  ...args: Array<GtvCompatible | null>
): Operation {
  return [name, [...args.map((a) => a.encodeGtv())]];
}

export async function getLastTimestamp(session: GtxClient): Promise<number> {
  return await session.query({ type: "ft3.get_last_timestamp" });
}

export async function getChainInfo(session: GtxClient): Promise<ChainInfo> {
  return Object.freeze(
    await session.query({ type: "ft3.get_blockchain_info" })
  );
}

export async function getVersion(session: GtxClient): Promise<string> {
  return Object.freeze(await session.query({ type: "ft3.get_version" }));
}

export async function send(tx: Itransaction): Promise<void> {
  return new Promise(function (resolve, reject) {
    tx.send(function (error?) {
      if (error) reject("FT send error: " + error.message);
      //possibly specify custom error message to know the function that called
      //this without reading stacktrace? stacktrace could be sufficient.
      resolve();
    });
  });
}

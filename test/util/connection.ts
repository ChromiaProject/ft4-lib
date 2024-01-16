import fetch from "node-fetch";
import { Buffer } from "buffer";

async function get(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}

export async function getBlockchainRid(
  nodeUrl: string,
  id: number,
): Promise<Buffer> {
  if (!Number.isInteger(id)) throw new Error("Invalid chain iid");
  if (!nodeUrl) throw new Error("Cannot get blockchain RID. Node url missing.");

  const blockchainRid = await get(`${nodeUrl}/brid/iid_${id}`);

  return Buffer.from(blockchainRid, "hex");
}

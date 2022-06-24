import { get } from "./http";

export async function getBRID(nodeUrl: string, id: number): Promise<Buffer> {
  if (!Number.isInteger(id)) throw new Error("Invalid chain iid");
  if (!nodeUrl) throw new Error("Cannot get BRID. Node url missing.");

  const brid = await get(`${nodeUrl}/brid/iid_${id}`);

  return Buffer.from(brid, "hex");
}

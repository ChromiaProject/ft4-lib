import fetch from "node-fetch";

async function get(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}

export async function getBRID(nodeUrl: string, id: number): Promise<Buffer> {
  if (!Number.isInteger(id)) throw new Error("Invalid chain iid");
  if (!nodeUrl) throw new Error("Cannot get BRID. Node url missing.");

  const brid = await get(`${nodeUrl}/brid/iid_${id}`);

  return Buffer.from(brid, "hex");
}

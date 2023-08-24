import { BufferId } from "../../cryptoUtils";
import { assetOriginById } from "./crosschain-queries";
import { Connection } from "../types";
import { freeze } from "../utils/types";
import { Buffer } from "buffer";

export async function getAssetOriginById(
  connection: Connection,
  id: BufferId,
): Promise<Buffer> {
  return await connection.query<Buffer>(assetOriginById(id)).then(freeze);
}

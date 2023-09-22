import { BufferId } from "../../cryptoUtils";
import * as Query from "./crosschain-queries";
import { Connection } from "../types";
import { Buffer } from "buffer";
import { PendingTransfer, PendingTransferResponse } from "./types";
import { freeze } from "../utils/types";

export async function getAssetOriginById(
  connection: Connection,
  id: BufferId,
): Promise<Buffer> {
  return await connection.query<Buffer>(Query.assetOriginById(id)).then(freeze);
}

export async function getPendingTransfersForAccount(
  connection: Connection,
  accountId: Buffer,
): Promise<PendingTransfer[]> {
  return await connection
    .query<PendingTransferResponse[]>(
      Query.pendingTransfersForAccount(accountId),
    )
    .then((res) =>
      res.map((pt) => ({
        accountId: pt.account_id,
        opIndex: pt.op_index,
        txRid: pt.tx_rid,
      })),
    );
}

export async function isTransferApplied(
  connection: Connection,
  txRid: Buffer,
  opIndex: number,
): Promise<boolean> {
  return await connection.query<boolean>(
    Query.isTransferApplied(txRid, opIndex),
  );
}

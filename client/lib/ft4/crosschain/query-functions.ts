import { Buffer } from "buffer";
import { BufferId } from "../../cryptoUtils";
import { Connection, OptionalPageCursor } from "../types";
import * as Query from "./queries";
import { PendingTransfer, PendingTransferResponse } from "./types";

export async function getAssetOriginById(
  connection: Connection,
  id: BufferId,
): Promise<Buffer> {
  return await connection.query<Buffer>(Query.assetOriginById(id));
}

export async function getPendingTransfersForAccount(
  connection: Connection,
  accountId: Buffer,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PendingTransfer[]> {
  return await connection
    .query<PendingTransferResponse[]>(
      Query.pendingTransfersForAccount(accountId, limit, cursor),
    )
    .then(mapPendingTransfers);
}

export function mapPendingTransfers(
  transfers: PendingTransferResponse[],
): PendingTransfer[] {
  return transfers.map((transfer) => ({
    accountId: transfer.account_id,
    opIndex: transfer.op_index,
    tx: transfer.tx_data,
  }));
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

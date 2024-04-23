import { Buffer } from "buffer";
import { Connection, OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import * as Query from "./queries";
import { PendingTransfer, PendingTransferResponse } from "./types";
import { Queryable, RawGtx, gtv } from "postchain-client";
import { BufferId } from "@ft4/utils";

export async function getAssetOriginById(
  connection: Connection,
  id: BufferId,
): Promise<Buffer | null> {
  return await connection.query(Query.assetOriginById(id));
}

export async function getPendingTransfersForAccount(
  connection: Queryable,
  accountId: Buffer,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PendingTransfer[]> {
  return await connection
    .query(Query.pendingTransfersForAccount(accountId, limit, cursor))
    .then(mapPendingTransfers);
}

export async function getLastPendingTransferForAccount(
  queryable: Queryable,
  senderId: BufferId,
  targetBlockchainRid: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: bigint,
): Promise<PendingTransfer | null> {
  return queryable
    .query(
      Query.lastPendingTransferForAccount(
        senderId,
        targetBlockchainRid,
        recipientId,
        assetId,
        amount,
      ),
    )
    .then((transfer) => transfer && mapPendingTransfer(transfer));
}

export function mapPendingTransfers(
  transfers: PendingTransferResponse[],
): PendingTransfer[] {
  return transfers.map(mapPendingTransfer);
}

export function mapPendingTransfer(
  transfer: PendingTransferResponse,
): PendingTransfer {
  return {
    opIndex: transfer.op_index,
    tx: gtv.decode(transfer.tx_data) as RawGtx,
    accountId: transfer.account_id,
  };
}

export async function isTransferApplied(
  connection: Connection,
  txRid: Buffer,
  opIndex: number,
): Promise<boolean> {
  return await connection.query(Query.isTransferApplied(txRid, opIndex));
}

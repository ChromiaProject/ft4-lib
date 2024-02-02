import { Buffer } from "buffer";
import { Connection, OptionalLimit, OptionalPageCursor } from "@ft4/types";
import * as Query from "./queries";
import { PendingTransfer, PendingTransferResponse } from "./types";
import { RawGtx, gtx } from "postchain-client";
import { BufferId } from "@ft4/utils";

export async function getAssetOriginById(
  connection: Connection,
  id: BufferId,
): Promise<Buffer | null> {
  return await connection.query(Query.assetOriginById(id));
}

export async function getPendingTransfersForAccount(
  connection: Connection,
  accountId: Buffer,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PendingTransfer[]> {
  return await connection
    .query(Query.pendingTransfersForAccount(accountId, limit, cursor))
    .then(mapPendingTransfers);
}

export function mapPendingTransfers(
  transfers: PendingTransferResponse[],
): PendingTransfer[] {
  return transfers.map((transfer) => {
    const deserialized = gtx.deserialize(transfer.tx_data);
    const tx: RawGtx = [
      [
        deserialized.blockchainRid,
        deserialized.operations.map((op) => [op.opName, op.args]),
        deserialized.signers,
      ],
      deserialized.signatures ?? [],
    ];
    return {
      accountId: transfer.account_id,
      opIndex: transfer.op_index,
      tx,
    };
  });
}

export async function isTransferApplied(
  connection: Connection,
  txRid: Buffer,
  opIndex: number,
): Promise<boolean> {
  return await connection.query(Query.isTransferApplied(txRid, opIndex));
}

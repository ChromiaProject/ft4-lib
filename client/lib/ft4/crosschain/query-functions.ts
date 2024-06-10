import { Buffer } from "buffer";
import { Connection, OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import * as Query from "./queries";
import { PendingTransfer, PendingTransferResponse } from "./types";
import { Queryable, RawGtx, gtv } from "postchain-client";
import { BufferId } from "@ft4/utils";

/**
 * Retrieves the brid of the origin chain for the specified asset
 * @param connection - the connection to use to query the blockchain
 * @param id - the id of the asset to fetch the origin for
 * @returns brid of the origin chain, or null if it was not found
 */
export async function getAssetOriginById(
  connection: Connection,
  id: BufferId,
): Promise<Buffer | null> {
  return await connection.query(Query.assetOriginById(id));
}

/**
 * Fetches a list of pending transfers for the specified account. If there are many pending transfers,
 * the results will be limited according to the `limit` and `cursor` parameters.
 * @param connection - the connection to use to query the blockchain
 * @param accountId - id of the account to fetch pending transfers for
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
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

/**
 * Retrieves the most recent pending transfer which matches the specified arguments
 * @param queryable - the client to use when querying the blockchain
 * @param senderId - the id of the account that originally sent the transfer that is now pending
 * @param targetBlockchainRid - the rid of the blockchain that the transfer were targeting
 * @param recipientId - the id of the account that is going to receive the transfer
 * @param assetId - the id of the asset that is being transferred
 * @param amount - how much of the asset that is being transferred
 */
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

/**
 * Converts a list of `PendingTransferResponse` objects into a list of `PendingTransfer` objects
 * @param transfers - the transfers to convert
 */
export function mapPendingTransfers(
  transfers: PendingTransferResponse[],
): PendingTransfer[] {
  return transfers.map(mapPendingTransfer);
}

/**
 * Converts a `PendingTransferResponse` object into a `PendingTransfer` object
 * @param transfer - the transfer to convert
 */
export function mapPendingTransfer(
  transfer: PendingTransferResponse,
): PendingTransfer {
  return {
    opIndex: transfer.op_index,
    tx: gtv.decode(transfer.tx_data) as RawGtx,
    accountId: transfer.account_id,
  };
}

/**
 * Checks if a specific transfer has been applied on the blockchain
 * @param connection - connection to the blockchain to check if the transfer was applied on
 * @param txRid - the rid of the transaction that contains the transfer
 * @param opIndex - the index of the transfer operation within that transaction
 * @returns true or false depending on if the transfer was applied or not
 */
export async function isTransferApplied(
  connection: Connection,
  txRid: Buffer,
  opIndex: number,
): Promise<boolean> {
  return await connection.query(Query.isTransferApplied(txRid, opIndex));
}

import { Buffer } from "buffer";
import { Connection, OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import * as Query from "./queries";
import {
  AppliedTransfer,
  AppliedTransferResponse,
  AssetOrigin,
  AssetOriginFilter,
  AssetOriginResponse,
  PendingTransfer,
  PendingTransfer_,
  PendingTransferFilter,
  PendingTransferResponse,
  PendingTransferResponse_,
  Transfer,
  TransferFilter,
  TransferResponse,
} from "./types";
import { Queryable, RawGtx, gtv } from "postchain-client";
import { BufferId, PaginatedEntity, retrievePaginatedEntity } from "@ft4/utils";
import { createAccountObjectFiltered } from "@ft4/accounts/query-functions";

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
 * Fetches a list of pending transfers for the specified account. If there are many pending
 * transfers, the results will be limited according to the `limit` and `cursor` parameters.
 *
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
 * Converts a list of `PendingTransferResponse` objects into a list of
 * `PendingTransfer` objects
 *
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

/**
 * Retrieves assets origin based on the selected filter of AssetOriginFilter, paginated
 *
 * @param connection - the connection to use to query the blockchain
 * @param assetOriginFilter - object of AssetOriginFilter that can be array of assetIds
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * @returns paginated results of assets origin based on the filter selection
 */
export async function getAssetOriginFiltered(
  connection: Connection,
  assetOriginFilter?: AssetOriginFilter | null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AssetOrigin>> {
  return retrievePaginatedEntity<AssetOrigin, AssetOriginResponse>(
    connection,
    Query.assetOriginFiltered(assetOriginFilter, limit, cursor),
    (assetOrigin) => assetOrigin.map(createAssetOriginObject),
  );
}

/**
 * Retrieves applied transfers based on the selected filter of TransferFilter, paginated
 *
 * @param connection - the connection to use to query the blockchain
 * @param appliedTransferFilter - object of TransferFilter that can be array of initTxRids and initOpIndex
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * @returns paginated results of applied transfers based on the filter selection
 */
export async function getAppliedTransfersFiltered(
  connection: Connection,
  appliedTransferFilter?: TransferFilter | null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AppliedTransfer>> {
  return retrievePaginatedEntity<AppliedTransfer, AppliedTransferResponse>(
    connection,
    Query.appliedTransferFiltered(appliedTransferFilter, limit, cursor),
    (appliedTransfers) => appliedTransfers.map(createAppliedTransferObject),
  );
}

/**
 * Retrieves canceled transfers based on the selected filter of in TransferFilter, paginated
 *
 * @param connection - the connection to use to query the blockchain
 * @param canceledTransferFilter - object of TransferFilter that can be array of initTxRids and initOpIndex
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * @returns paginated results of canceled transfers based on the filter selection
 */
export async function getCanceledTransfersFiltered(
  connection: Connection,
  canceledTransferFilter?: TransferFilter | null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Transfer>> {
  return retrievePaginatedEntity<Transfer, TransferResponse>(
    connection,
    Query.canceledTransferFiltered(canceledTransferFilter, limit, cursor),
    (canceledTransfers) => canceledTransfers.map(createTransferObject),
  );
}

/**
 * Retrieves unapplied transfers based on the selected filter of TransferFilter, paginated
 *
 * @param connection - the connection to use to query the blockchain
 * @param unappliedTransferFilter - object of TransferFilter that can be array of initTxRids and initOpIndex
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * @returns paginated results of unapplied transfers based on the filter selection
 */
export async function getUnappliedTransfersFiltered(
  connection: Connection,
  unappliedTransferFilter?: TransferFilter | null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Transfer>> {
  return retrievePaginatedEntity<Transfer, TransferResponse>(
    connection,
    Query.unappliedTransferFiltered(unappliedTransferFilter, limit, cursor),
    (unappliedTransfers) => unappliedTransfers.map(createTransferObject),
  );
}

/**
 * Retrieves recalled transfers based on the selected filter of TransferFilter, paginated
 *
 * @param connection - the connection to use to query the blockchain
 * @param recalledTransferFilter - object of TransferFilter that can be array of initTxRids and initOpIndex
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * @returns paginated results of recalled transfers based on the filter selection
 */
export async function getRecalledTransfersFiltered(
  connection: Connection,
  recalledTransferFilter?: TransferFilter | null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Transfer>> {
  return retrievePaginatedEntity<Transfer, TransferResponse>(
    connection,
    Query.recalledTransferFiltered(recalledTransferFilter, limit, cursor),
    (recalledTransfers) => recalledTransfers.map(createTransferObject),
  );
}

/**
 * Retrieves pending transfers based on the selected filter of PendingTransferFilter, paginated
 *
 * @param connection - the connection to use to query the blockchain
 * @param pendingTransferFilter - object of PendingTransferFilter that can be array of transactionIds, initOpIndex and senderAccountId
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * @returns paginated results of pending transfers based on the filter selection
 */
export async function getPendingTransfersFiltered(
  connection: Connection,
  pendingTransferFilter?: PendingTransferFilter | null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<PendingTransfer_>> {
  return retrievePaginatedEntity<PendingTransfer_, PendingTransferResponse_>(
    connection,
    Query.pendingTransferFiltered(pendingTransferFilter, limit, cursor),
    (pendingTransfers) => pendingTransfers.map(createPendingTransferObject),
  );
}

/**
 * Retrieves reverted transfers based on the selected filter of TransferFilter, paginated
 *
 * @param connection - connection to the blockchain to check if the transfer was applied on
 * @param revertedTransferFilter - object of TransferFilter that can be list of array of initTxRids and initOpIndex
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * @returns paginated results of reverted transfers based on the filter selection
 */
export async function getRevertedTransfersFiltered(
  connection: Connection,
  revertedTransferFilter?: TransferFilter | null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Transfer>> {
  return retrievePaginatedEntity<Transfer, TransferResponse>(
    connection,
    Query.revertedTransferFiltered(revertedTransferFilter, limit, cursor),
    (pendingTransfers) => pendingTransfers.map(createTransferObject),
  );
}

export function createAssetOriginObject(
  assetOrigin: AssetOriginResponse,
): AssetOrigin {
  return Object.freeze({
    asset: {
      id: assetOrigin.asset.id,
      name: assetOrigin.asset.name,
      symbol: assetOrigin.asset.symbol,
      decimals: assetOrigin.asset.decimals,
      blockchainRid: assetOrigin.asset.blockchain_rid,
      iconUrl: assetOrigin.asset.icon_url,
      type: assetOrigin.asset.type,
      supply: assetOrigin.asset.supply,
    },
    originBlockchainRid: assetOrigin.origin_blockchain_rid,
  });
}

function createAppliedTransferObject(
  appliedTransfer: AppliedTransferResponse,
): AppliedTransfer {
  return Object.freeze({
    initTxRid: appliedTransfer.init_tx_rid,
    initOpIndex: appliedTransfer.init_op_index,
    transactionId: appliedTransfer.transaction_rid,
    opIndex: appliedTransfer.op_index,
  });
}

function createTransferObject(transfer: TransferResponse): Transfer {
  return Object.freeze({
    initTxRid: transfer.init_tx_rid,
    initOpIndex: transfer.init_op_index,
  });
}

function createPendingTransferObject(
  pendingTransfer: PendingTransferResponse_,
): PendingTransfer_ {
  return Object.freeze({
    transactionId: pendingTransfer.transaction_rid,
    opIndex: pendingTransfer.op_index,
    senderAccount: createAccountObjectFiltered(pendingTransfer.sender_account),
  });
}

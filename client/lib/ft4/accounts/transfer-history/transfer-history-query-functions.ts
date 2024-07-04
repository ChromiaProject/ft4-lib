import {
  transferDetails,
  transferDetailsByAsset,
  transferHistoryFromHeight,
} from "./transfer-history-queries";
import { Queryable } from "postchain-client";
import { OptionalPageCursor } from "@ft4/ft-session";
import { retrievePaginatedEntity, BufferId } from "@ft4/utils";
import {
  TransferDetail,
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
  RawTransferDetail,
} from "./types";
import { createTransferHistoryEntryFromResponse } from "./transfer-history-entry";

/**
 * Retrieves the details of a transfer
 * @param connection - connection to the blockchain where the transfer was made
 * @param txRid - the id of the transaction in which the transfer was made
 * @param opIndex - the index of the transfer operation within the transaction
 * @returns Details about the transfer
 */
export function getTransferDetails(
  connection: Queryable,
  txRid: BufferId,
  opIndex: number,
): Promise<TransferDetail[]> {
  return connection
    .query(transferDetails(txRid, opIndex))
    .then((tds) => tds.map(createTransferDetail));
}

/**
 * Retrieves details of a transfer but only the details that was made with a specific asset
 * @param connection - connection to the blockchain where the transfer was made
 * @param txRid - the id of the transaction in which the transfer was made
 * @param opIndex - the index of the transfer operation within the transaction
 * @param assetId - the asset id for which to return details
 * @returns The transfer details
 */
export function getTransferDetailsByAsset(
  connection: Queryable,
  txRid: BufferId,
  opIndex: number,
  assetId: BufferId,
): Promise<TransferDetail[]> {
  return connection
    .query(transferDetailsByAsset(txRid, opIndex, assetId))
    .then((tds) => tds.map(createTransferDetail));
}

function createTransferDetail(td: RawTransferDetail) {
  return Object.freeze({
    blockchainRid: td.blockchain_rid,
    accountId: td.account_id,
    assetId: td.asset_id,
    delta: td.delta,
    isInput: td.is_input !== 0,
  });
}

/**
 * Gets the transfer history of an asset from a given height as a paginated entity
 * @param connection - the connection to use when querying the blockchain
 * @param height - which block height to get transfer history from
 * @param assetId - the id of the asset to get transfer history for
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export function getTransferHistoryFromHeight(
  connection: Queryable,
  height: number,
  assetId: BufferId | null,
  limit: number,
  cursor: OptionalPageCursor = null,
) {
  return retrievePaginatedEntity<
    TransferHistoryEntry,
    TransferHistoryEntryResponse
  >(
    connection,
    transferHistoryFromHeight(height, assetId, limit, cursor),
    (entries) =>
      entries.map((entry) => createTransferHistoryEntryFromResponse(entry)),
  );
}

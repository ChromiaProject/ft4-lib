import { OptionalPageCursor } from "@ft4/ft-session";
import { BufferId } from "@ft4/utils";
import { Buffer } from "buffer";
import { QueryObject, formatter } from "postchain-client";
import { RawTransferDetail, TransferHistoryEntryResponse } from "./types";

/**
 * Creates a query object for `ft4.get_transfer_details`-query
 * @param txRid - the transaction in which the transfer was made
 * @param opIndex - the index of the operation in the transaction
 */
export function transferDetails(
  txRid: BufferId,
  opIndex: number,
): QueryObject<
  RawTransferDetail[],
  {
    tx_rid: Buffer;
    op_index: number;
  }
> {
  return {
    name: "ft4.get_transfer_details",
    args: { tx_rid: formatter.ensureBuffer(txRid), op_index: opIndex },
  };
}

/**
 * Creates a query object for `ft4.get_transfer_details_by_asset`-query
 * @param txRid - the transaction in which the transfer was made
 * @param opIndex - the index of the operation in the transaction
 * @param assetId - the asset which to return details for
 */
export function transferDetailsByAsset(
  txRid: BufferId,
  opIndex: number,
  assetId: BufferId,
): QueryObject<
  RawTransferDetail[],
  {
    tx_rid: Buffer;
    op_index: number;
    asset_id: Buffer;
  }
> {
  return {
    name: "ft4.get_transfer_details_by_asset",
    args: {
      tx_rid: formatter.ensureBuffer(txRid),
      op_index: opIndex,
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

/**
 * Creates a query object for the query `ft4.get_transfer_history_from_height`
 * @param height - which block height to get transfer history from
 * @param assetId - the id of the asset to get transfer history for
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export function transferHistoryFromHeight(
  height: number,
  assetId: BufferId | null,
  limit: number,
  cursor: OptionalPageCursor = null,
): QueryObject<
  TransferHistoryEntryResponse[],
  {
    height: number;
    asset_id: Buffer | null;
    page_size: number;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_transfer_history_from_height",
    args: {
      height: height,
      asset_id: assetId ? formatter.ensureBuffer(assetId) : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

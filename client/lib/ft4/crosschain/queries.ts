import { QueryObject, formatter } from "postchain-client";
import { Buffer } from "buffer";
import { OptionalPageCursor } from "../types";
import { PendingTransferResponse } from "./types";
import { BufferId } from "@ft4/utils/types";

export function assetOriginById(
  assetId: BufferId,
): QueryObject<Buffer, { asset_id: Buffer }> {
  return {
    name: "ft4.crosschain.get_asset_origin_by_id",
    args: {
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function pendingTransfersForAccount(
  accountId: BufferId,
  limit: number,
  cursor: OptionalPageCursor,
): QueryObject<
  PendingTransferResponse[],
  {
    account_id: Buffer;
    page_size: number;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_pending_transfers_for_account",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function isTransferApplied(
  txRid: Buffer,
  opIndex: number,
): QueryObject<boolean, { tx_rid: Buffer; op_index: number }> {
  return {
    name: "ft4.crosschain.is_transfer_applied",
    args: {
      tx_rid: txRid,
      op_index: opIndex,
    },
  };
}

import { QueryObject, RawGtx, formatter } from "postchain-client";
import { Buffer } from "buffer";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { PendingTransferResponse } from "./types";
import { BufferId } from "@ft4/utils";

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

/**
 * Creates a query object used to calling the `ft4.crosschain.get_pending_transfers_for_account` query
 * @param accountId - id of the account to fetch queries for
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export function pendingTransfersForAccount(
  accountId: BufferId,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PendingTransferResponse[],
  {
    account_id: Buffer;
    page_size: OptionalLimit;
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

export function lastPendingTransferForAccount(
  senderId: BufferId,
  targetBlockchainRid: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: bigint,
): QueryObject<
  PendingTransferResponse,
  {
    sender_id: Buffer;
    target_blockchain_rid: Buffer;
    recipient_id: Buffer;
    asset_id: Buffer;
    amount: bigint;
  }
> {
  return {
    name: "ft4.crosschain.get_last_pending_transfer_for_account",
    args: {
      sender_id: formatter.ensureBuffer(senderId),
      target_blockchain_rid: formatter.ensureBuffer(targetBlockchainRid),
      recipient_id: formatter.ensureBuffer(recipientId),
      asset_id: formatter.ensureBuffer(assetId),
      amount,
    },
  };
}

export function isTransferApplied(
  initTxRid: Buffer,
  initOpIndex: number,
): QueryObject<boolean, { init_tx_rid: Buffer; init_op_index: number }> {
  return {
    name: "ft4.crosschain.is_transfer_applied",
    args: {
      init_tx_rid: initTxRid,
      init_op_index: initOpIndex,
    },
  };
}

export function applyTransferTx(
  initTxRid: Buffer,
  initOpIndex: number,
): QueryObject<
  { tx: RawGtx; op_index: number },
  { init_tx_rid: Buffer; init_op_index: number }
> {
  return {
    name: "ft4.crosschain.get_apply_transfer_tx",
    args: {
      init_tx_rid: initTxRid,
      init_op_index: initOpIndex,
    },
  };
}

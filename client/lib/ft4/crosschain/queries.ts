import { BufferId, QueryObject, RawGtx, formatter } from "postchain-client";
import { Buffer } from "buffer";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import {
  AppliedTransferResponse,
  AssetOriginFilter,
  AssetOriginResponse,
  PendingTransferFilter,
  PendingTransferResponse,
  TransferFilter,
  TransferResponse,
} from "./types";
import { PaginatedEntity } from "@ft4/utils";

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
  accountId: BufferId,
  targetBlockchainRid: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: bigint,
): QueryObject<
  PendingTransferResponse,
  {
    account_id: Buffer;
    target_blockchain_rid: Buffer;
    recipient_id: Buffer;
    asset_id: Buffer;
    amount: bigint;
  }
> {
  return {
    name: "ft4.crosschain.get_last_pending_transfer_for_account",
    args: {
      account_id: formatter.ensureBuffer(accountId),
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

export function assetOriginFiltered(
  assetOriginFilter: AssetOriginFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AssetOriginResponse>,
  {
    asset_origin_filter: [assetIds: Array<Buffer> | null] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_asset_origin_filtered",
    args: {
      asset_origin_filter: assetOriginFilter
        ? [assetOriginFilter.assetIds ?? null]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function appliedTransferFiltered(
  appliedTransferFilter: TransferFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AppliedTransferResponse>,
  {
    applied_transfers_filter:
      | [initTxRids: Array<Buffer> | null, initOpIndex: number | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_applied_transfers_filtered",
    args: {
      applied_transfers_filter: appliedTransferFilter
        ? [
            appliedTransferFilter.initTxRids ?? null,
            appliedTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function canceledTransferFiltered(
  canceledTransferFilter: TransferFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<TransferResponse>,
  {
    canceled_transfers_filter:
      | [initTxRids: Array<Buffer> | null, initOpIndex: number | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_canceled_transfers_filtered",
    args: {
      canceled_transfers_filter: canceledTransferFilter
        ? [
            canceledTransferFilter.initTxRids ?? null,
            canceledTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function unappliedTransferFiltered(
  unappliedTransferFilter: TransferFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<TransferResponse>,
  {
    unapplied_transfers_filter:
      | [initTxRids: Array<Buffer> | null, initOpIndex: number | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_unapplied_transfers_filtered",
    args: {
      unapplied_transfers_filter: unappliedTransferFilter
        ? [
            unappliedTransferFilter.initTxRids ?? null,
            unappliedTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function recalledTransferFiltered(
  recalledTransferFilter: TransferFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<TransferResponse>,
  {
    recalled_transfers_filter:
      | [initTxRids: Array<Buffer> | null, initOpIndex: number | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_recalled_transfers_filtered",
    args: {
      recalled_transfers_filter: recalledTransferFilter
        ? [
            recalledTransferFilter.initTxRids ?? null,
            recalledTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function pendingTransferFiltered(
  pendingTransferFilter: PendingTransferFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<PendingTransferResponse>,
  {
    pending_transfer_filter:
      | [
          transactionIds: Array<Buffer> | null,
          initOpIndex: number | null,
          senderAccountId: Buffer | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_pending_transfers_filtered",
    args: {
      pending_transfer_filter: pendingTransferFilter
        ? [
            pendingTransferFilter.transactionIds ?? null,
            pendingTransferFilter.initOpIndex ?? null,
            pendingTransferFilter.senderAccountId ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function revertedTransferFiltered(
  revertedTransferFilter: TransferFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<PendingTransferResponse>,
  {
    reverted_transfer_filter:
      | [initTxRids: Array<Buffer> | null, initOpIndex: number | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_reverted_transfers_filtered",
    args: {
      reverted_transfer_filter: revertedTransferFilter
        ? [
            revertedTransferFilter.initTxRids ?? null,
            revertedTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

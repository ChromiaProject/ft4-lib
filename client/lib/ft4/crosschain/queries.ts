import { QueryObject, RawGtx, formatter } from "postchain-client";
import { Buffer } from "buffer";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import {
  AppliedTransferResponse,
  AssetOriginFilter,
  AssetOriginResponse,
  PendingTransferFilter,
  PendingTransferResponse,
  PendingTransferResponse_,
  TransferFilter,
  TransferResponse,
} from "./types";
import { BufferId, PaginatedEntity } from "@ft4/utils";

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

export function assetOriginByRowid(
  rowid: number,
): QueryObject<AssetOriginResponse, { rowid: number }> {
  return {
    name: "ft4.crosschain.get_asset_origin_by_rowid",
    args: { rowid },
  };
}

export function assetOriginFiltered(
  assetOriginFilter: AssetOriginFilter | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AssetOriginResponse>,
  {
    asset_origin_filter: [Array<number>, Buffer | null] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.crosschain.get_asset_origin_filtered",
    args: {
      asset_origin_filter: assetOriginFilter
        ? [assetOriginFilter?.rowids ?? [], assetOriginFilter.assetId ?? null]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function appliedTransferByRowid(
  rowid: number,
): QueryObject<AppliedTransferResponse, { rowid: number }> {
  return {
    name: "ft4.crosschain.get_applied_transfer_by_rowid",
    args: { rowid },
  };
}

export function appliedTransferFiltered(
  appliedTransferFilter: TransferFilter | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AppliedTransferResponse>,
  {
    applied_transfers_filter:
      | [Array<number>, Buffer | null, number | null]
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
            appliedTransferFilter?.rowids ?? [],
            appliedTransferFilter.initTxRid ?? null,
            appliedTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function canceledTransferByRowid(
  rowid: number,
): QueryObject<TransferResponse, { rowid: number }> {
  return {
    name: "ft4.crosschain.get_canceled_transfer_by_rowid",
    args: { rowid },
  };
}

export function canceledTransferFiltered(
  canceledTransferFilter: TransferFilter | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<TransferResponse>,
  {
    canceled_transfers_filter:
      | [Array<number>, Buffer | null, number | null]
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
            canceledTransferFilter?.rowids ?? [],
            canceledTransferFilter.initTxRid ?? null,
            canceledTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function unappliedTransferByRowid(
  rowid: number,
): QueryObject<TransferResponse, { rowid: number }> {
  return {
    name: "ft4.crosschain.get_unapplied_transfer_by_rowid",
    args: { rowid },
  };
}

export function unappliedTransferFiltered(
  unappliedTransferFilter: TransferFilter | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<TransferResponse>,
  {
    unapplied_transfers_filter:
      | [Array<number>, Buffer | null, number | null]
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
            unappliedTransferFilter?.rowids ?? [],
            unappliedTransferFilter.initTxRid ?? null,
            unappliedTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function recalledTransferByRowid(
  rowid: number,
): QueryObject<TransferResponse, { rowid: number }> {
  return {
    name: "ft4.crosschain.get_recalled_transfer_by_rowid",
    args: { rowid },
  };
}

export function recalledTransferFiltered(
  recalledTransferFilter: TransferFilter | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<TransferResponse>,
  {
    recalled_transfers_filter:
      | [Array<number>, Buffer | null, number | null]
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
            recalledTransferFilter?.rowids ?? [],
            recalledTransferFilter.initTxRid ?? null,
            recalledTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function pendingTransferByRowid(
  rowid: number,
): QueryObject<PendingTransferResponse_, { rowid: number }> {
  return {
    name: "ft4.crosschain.get_pending_transfer_by_rowid",
    args: { rowid },
  };
}

export function pendingTransferFiltered(
  pendingTransferFilter: PendingTransferFilter | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<PendingTransferResponse_>,
  {
    pending_transfer_filter:
      | [Array<number>, Buffer | null, number | null, Buffer | null]
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
            pendingTransferFilter?.rowids ?? [],
            pendingTransferFilter.transactionId ?? null,
            pendingTransferFilter.initOpIndex ?? null,
            pendingTransferFilter.senderAccountId ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function revertedTransferByRowid(
  rowid: number,
): QueryObject<TransferResponse, { rowid: number }> {
  return {
    name: "ft4.crosschain.get_reverted_transfer_by_rowid",
    args: { rowid },
  };
}

export function revertedTransferFiltered(
  revertedTransferFilter: TransferFilter | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<PendingTransferResponse_>,
  {
    reverted_transfer_filter:
      | [Array<number>, Buffer | null, number | null]
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
            revertedTransferFilter?.rowids ?? [],
            revertedTransferFilter.initTxRid ?? null,
            revertedTransferFilter.initOpIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

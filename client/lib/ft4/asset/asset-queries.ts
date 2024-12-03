import { QueryObject, formatter } from "postchain-client";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { Buffer } from "buffer";
import {
  AssetFilters,
  AssetResponse,
  BalanceFilters,
  BalanceResponse,
  CrosschainAssetRegistrationResponse,
  CrosschainTransferHistoryEntriesFilters,
  TransferHistoryEntriesFilters,
} from "./types";
import { BufferId, PaginatedEntity } from "@ft4/utils";
import { TransferHistoryEntryResponse } from "@ft4/accounts";
import { CrosschainTransferhistoryEntryResponse } from "@ft4/accounts/transfer-history";

export function assetByRowId(
  rowId: number,
): QueryObject<AssetResponse, { rowid: number }> {
  return {
    name: "ft4.get_asset_by_rowid",
    args: {
      rowid: rowId,
    },
  };
}

export function assetById(
  assetId: BufferId,
): QueryObject<AssetResponse, { asset_id: Buffer }> {
  return {
    name: "ft4.get_asset_by_id",
    args: {
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function assetsBySymbol(
  symbol: string,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  AssetResponse,
  { symbol: string; page_size: OptionalLimit; page_cursor: OptionalPageCursor }
> {
  return {
    name: "ft4.get_assets_by_symbol",
    args: {
      symbol,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function assetsByName(
  name: string,
  limit: OptionalLimit,
  cursor: OptionalPageCursor = null,
): QueryObject<
  AssetResponse,
  {
    name: string;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_assets_by_name",
    args: {
      name: name,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function assetsByType(
  type: string,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AssetResponse>,
  { type: string; page_size: OptionalLimit; page_cursor: OptionalPageCursor }
> {
  return {
    name: "ft4.get_assets_by_type",
    args: {
      type: type,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function allAssets(
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AssetResponse>,
  { page_size: OptionalLimit; page_cursor: OptionalPageCursor }
> {
  return {
    name: "ft4.get_all_assets",
    args: {
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function assetsFiltered(
  assetFilters: AssetFilters | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AssetResponse>,
  {
    asset_filters:
      | [
          Array<number>,
          Buffer | null,
          string | null,
          string | null,
          string | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_assets_filtered",
    args: {
      asset_filters: assetFilters
        ? [
            assetFilters?.rowids ?? [],
            assetFilters?.id ?? null,
            assetFilters?.name ?? null,
            assetFilters?.symbol ?? null,
            assetFilters?.type ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function balanceByRowId(
  rowId: number,
): QueryObject<BalanceResponse, { rowid: number }> {
  return {
    name: "ft4.get_balance_by_rowid",
    args: {
      rowid: rowId,
    },
  };
}

export function balanceByAccountId(
  accountId: BufferId,
  assetId: BufferId,
): QueryObject<BalanceResponse, { account_id: Buffer; asset_id: Buffer }> {
  return {
    name: "ft4.get_asset_balance",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function balancesByAccountId(
  accountId: BufferId,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): QueryObject<
  PaginatedEntity<BalanceResponse>,
  {
    account_id: Buffer;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_asset_balances",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function balancesFiltered(
  balanceFilters: BalanceFilters | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<BalanceResponse>,
  {
    balance_filters: [Array<number>, Buffer | null, Buffer | null] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_balances_filtered",
    args: {
      balance_filters: balanceFilters
        ? [
            balanceFilters?.rowids ?? [],
            balanceFilters?.account_id ?? null,
            balanceFilters?.asset_id ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function assetDetailsForCrosschainRegistration(
  assetId: BufferId,
): QueryObject<CrosschainAssetRegistrationResponse, { asset_id: Buffer }> {
  return {
    name: "ft4.get_asset_details_for_crosschain_registration",
    args: {
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function transferHistoryEntriesFiltered(
  transferHistoryEntryFilters: TransferHistoryEntriesFilters | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<TransferHistoryEntryResponse>,
  {
    transfer_history_entry_filters:
      | [
          Array<number>,
          Buffer | null,
          Buffer | null,
          Buffer | null,
          number | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_transfer_history_entries_filtered",
    args: {
      transfer_history_entry_filters: transferHistoryEntryFilters
        ? [
            transferHistoryEntryFilters?.rowids ?? [],
            transferHistoryEntryFilters?.account_id ?? null,
            transferHistoryEntryFilters?.asset_id ?? null,
            transferHistoryEntryFilters?.transaction_rid ?? null,
            transferHistoryEntryFilters?.op_index ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function transferHistoryEntryByRowId(
  rowId: number,
): QueryObject<TransferHistoryEntryResponse, { rowid: number }> {
  return {
    name: "ft4.get_transfer_history_entry_by_rowid",
    args: {
      rowid: rowId,
    },
  };
}

export function crossChainTransferHistoryEntriesFiltered(
  crosschainTransferHistoryEntryFilters: CrosschainTransferHistoryEntriesFilters | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<CrosschainTransferhistoryEntryResponse>,
  {
    crosschain_transfer_history_entry_filters:
      | [
          Array<number>,
          Buffer | null,
          Buffer | null,
          Buffer | null,
          number | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_crosschain_transfer_history_entries_filtered",
    args: {
      crosschain_transfer_history_entry_filters:
        crosschainTransferHistoryEntryFilters
          ? [
              crosschainTransferHistoryEntryFilters?.rowids ?? [],
              crosschainTransferHistoryEntryFilters?.account_id ?? null,
              crosschainTransferHistoryEntryFilters?.asset_id ?? null,
              crosschainTransferHistoryEntryFilters?.transaction_rid ?? null,
              crosschainTransferHistoryEntryFilters?.op_index ?? null,
            ]
          : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function crosschainTransferHistoryEntryByRowId(
  rowId: number,
): QueryObject<CrosschainTransferhistoryEntryResponse, { rowid: number }> {
  return {
    name: "ft4.get_crosschain_transfer_history_entry_by_rowid",
    args: {
      rowid: rowId,
    },
  };
}

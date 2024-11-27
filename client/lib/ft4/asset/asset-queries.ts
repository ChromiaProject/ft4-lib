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
  assetFilters: Array<AssetFilters>,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
) {
  return {
    name: "ft4.get_assets",
    args: {
      asset_filters: assetFilters,
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
  balanceFilters: Array<BalanceFilters>,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
) {
  return {
    name: "ft4.get_balances",
    args: {
      balance_filters: balanceFilters,
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
  transferHistoryEntriesFilters: Array<TransferHistoryEntriesFilters>,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
) {
  return {
    name: "ft4.get_transfer_history_entries",
    args: {
      transfer_history_entries_filters: transferHistoryEntriesFilters,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function transferHistoryEntryByRowId(
  rowId: number,
): QueryObject<TransferHistoryEntryResponse, { rowid: number }> {
  return {
    name: "ft4.get_transfer_history_entries",
    args: {
      rowid: rowId,
    },
  };
}

export function crossChainTransferHistoryEntriesFiltered(
  crosschainTransferHistoryEntriesFilters: Array<CrosschainTransferHistoryEntriesFilters>,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
) {
  return {
    name: "ft4.get_crosschain_transfer_history_entries",
    args: {
      crosschain_transfer_history_entries_filters:
        crosschainTransferHistoryEntriesFilters,
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

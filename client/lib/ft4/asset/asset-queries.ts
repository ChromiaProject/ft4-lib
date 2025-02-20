import { QueryObject, formatter } from "postchain-client";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { Buffer } from "buffer";
import {
  AssetFilter,
  AssetResponse,
  BalanceFilter,
  BalanceResponse,
  CrosschainAssetRegistrationResponse,
  CrosschainTransferHistoryEntryFilter,
  TransferHistoryEntryFilter,
} from "./types";
import { BufferId, PaginatedEntity } from "@ft4/utils";
import { TransferHistoryEntryResponse } from "@ft4/accounts";
import { CrosschainTransferHistoryEntryResponse } from "@ft4/accounts/transfer-history";

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
  assetFilter: AssetFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<AssetResponse>,
  {
    asset_filter:
      | [
          ids: Array<Buffer> | null,
          name: string | null,
          symbol: string | null,
          type: string | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_assets_filtered",
    args: {
      asset_filter: assetFilter
        ? [
            assetFilter.ids ?? null,
            assetFilter.name ?? null,
            assetFilter.symbol ?? null,
            assetFilter.type ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
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
  balanceFilter: BalanceFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<BalanceResponse>,
  {
    balance_filter:
      | [accountIds: Array<Buffer> | null, assetIds: Array<Buffer> | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_balances_filtered",
    args: {
      balance_filter: balanceFilter
        ? [balanceFilter.accountIds ?? null, balanceFilter.assetIds ?? null]
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
  transferHistoryEntryFilter: TransferHistoryEntryFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<TransferHistoryEntryResponse>,
  {
    transfer_history_entry_filter:
      | [
          accountIds: Array<Buffer> | null,
          assetIds: Array<Buffer> | null,
          transactionRids: Array<Buffer> | null,
          opIndex: number | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_transfer_history_entries_filtered",
    args: {
      transfer_history_entry_filter: transferHistoryEntryFilter
        ? [
            transferHistoryEntryFilter.accountIds ?? null,
            transferHistoryEntryFilter.assetIds ?? null,
            transferHistoryEntryFilter.transactionRids ?? null,
            transferHistoryEntryFilter.opIndex ?? null,
          ]
        : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function crossChainTransferHistoryEntriesFiltered(
  crosschainTransferHistoryEntryFilter: CrosschainTransferHistoryEntryFilter,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  PaginatedEntity<CrosschainTransferHistoryEntryResponse>,
  {
    crosschain_transfer_history_entry_filter:
      | [
          accountIds: Array<Buffer> | null,
          assetIds: Array<Buffer> | null,
          transactionRids: Array<Buffer> | null,
          opIndex: number | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_crosschain_transfer_history_entries_filtered",
    args: {
      crosschain_transfer_history_entry_filter:
        crosschainTransferHistoryEntryFilter
          ? [
              crosschainTransferHistoryEntryFilter.accountIds ?? null,
              crosschainTransferHistoryEntryFilter.assetIds ?? null,
              crosschainTransferHistoryEntryFilter.transactionRids ?? null,
              crosschainTransferHistoryEntryFilter.opIndex ?? null,
            ]
          : null,
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

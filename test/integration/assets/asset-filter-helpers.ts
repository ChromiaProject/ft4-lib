import {
  AssetFilter,
  BalanceFilter,
  CrosschainTransferHistoryEntryFilter,
  TransferHistoryEntryFilter,
} from "@ft4/asset/types";

export function setAssetFilter(
  ids: Array<Buffer> | null,
  name: string | null = null,
  symbol: string | null = null,
  type: string | null = null,
): AssetFilter {
  return { ids, name, symbol, type };
}

export function setBalanceFilter(
  accountIds: Array<Buffer> | null = null,
  assetIds: Array<Buffer> | null = null,
): BalanceFilter {
  return { accountIds, assetIds };
}

export function setCrosschainAndTransferHistoryEntryFilter(
  accountIds: Array<Buffer> | null = null,
  assetIds: Array<Buffer> | null = null,
  transactionRids: Array<Buffer> | null = null,
  opIndex: number | null = null,
): TransferHistoryEntryFilter | CrosschainTransferHistoryEntryFilter {
  return {
    accountIds,
    assetIds,
    transactionRids,
    opIndex,
  };
}

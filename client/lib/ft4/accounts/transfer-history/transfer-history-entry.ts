import { TransferHistoryEntry, TransferHistoryEntryResponse } from "./types";
import { createAmountFromBalance } from "../../asset/amount";
import { formatter } from "postchain-client";
import { createAssetObject } from "../../asset/asset-query-functions";

export function createTransferHistoryEntryFromResponse(
  responseEntry: TransferHistoryEntryResponse,
): TransferHistoryEntry {
  const {
    id: rowid,
    delta,
    asset_data: asset,
    is_input: isInput,
    timestamp,
    block_height: blockHeight,
    entry_index: entryIndex,
    tx_rid: txRid,
    tx_data: txData,
    operation_name: operationName,
  } = responseEntry;

  return Object.freeze({
    rowid,
    isInput: isInput === 1,
    delta: createAmountFromBalance(delta, asset.decimals),
    asset: { name: asset.name, id: formatter.ensureBuffer(asset.id) },
    assetData: createAssetObject(asset),
    entryIndex,
    data: formatter.ensureBuffer(txData),
    timestamp: new Date(timestamp),
    transactionId: formatter.ensureBuffer(txRid),
    blockHeight,
    operationName,
  });
}

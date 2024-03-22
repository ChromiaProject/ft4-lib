import { TransferHistoryEntry, TransferHistoryEntryResponse } from "./types";
import { createAmountFromBalance } from "@ft4/asset/amount";
import { formatter } from "postchain-client";
import { createAssetObject } from "@ft4/asset/asset-query-functions";

export function createTransferHistoryEntryFromResponse(
  responseEntry: TransferHistoryEntryResponse,
): TransferHistoryEntry {
  const {
    id: rowid,
    delta,
    asset,
    is_input: isInput,
    timestamp,
    block_height: blockHeight,
    tx_rid: txRid,
    tx_data: txData,
    operation_name: operationName,
    op_index: opIndex,
    is_crosschain,
  } = responseEntry;

  return Object.freeze({
    rowid,
    isInput: isInput === 1,
    delta: createAmountFromBalance(delta, asset.decimals),
    asset: createAssetObject(asset),
    data: formatter.ensureBuffer(txData),
    timestamp: new Date(timestamp),
    transactionId: formatter.ensureBuffer(txRid),
    blockHeight,
    operationName,
    opIndex,
    isCrosschain: is_crosschain === 1,
  });
}

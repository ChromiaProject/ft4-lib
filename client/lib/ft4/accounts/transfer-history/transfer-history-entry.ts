import { BufferId } from "../../../cryptoUtils";
import { TransferHistoryEntry, TransferHistoryEntryResponse } from "./types";
import { createAmountFromBalance } from "../../asset/amount";
import { formatter, gtv } from "postchain-client";
import { Buffer } from "buffer";
import { AssetResponse } from "/ft4/asset/types";
import { createAssetObject } from "/ft4/asset/asset-query-functions";

export function createTransferHistoryEntry(
  rowid: number,
  isInput: boolean,
  delta: bigint,
  asset: AssetResponse,
  entryIndex: number,
  data: Buffer | string,
  transferArgs: { amount: bigint; accountId: BufferId }[][],
  timestamp: Date | number,
  transactionId: BufferId,
  blockHeight: number,
  operationName: string
): TransferHistoryEntry {
  const txArgs = transferArgs.map((list) =>
    list.map((a) => ({
      amount: createAmountFromBalance(a.amount, asset.decimals),
      accountId: formatter.ensureBuffer(a.accountId),
    }))
  );
  return Object.freeze({
    rowid,
    isInput,
    delta: createAmountFromBalance(delta, asset.decimals),
    asset: createAssetObject(asset),
    entryIndex,
    data: formatter.ensureBuffer(data),
    transferInputArgs: txArgs[0],
    transferOutputArgs: txArgs[1],
    timestamp: typeof timestamp === "number" ? new Date(timestamp) : timestamp,
    transactionId: formatter.ensureBuffer(transactionId),
    blockHeight,
    operationName,
  });
}

export function createTransferHistoryEntryFromResponse(
  responseEntry: TransferHistoryEntryResponse
): TransferHistoryEntry {
  const {
    id: rowId,
    delta,
    asset,
    is_input: isInput,
    timestamp,
    block_height: blockHeight,
    entry_index: entryIndex,
    transfer_args: transferArgs,
    tx_rid: txRid,
    tx_data: txData,
    operation_name: operationName,
  } = responseEntry;

  const args = (<[bigint, string][][]>(
    gtv.decode(Buffer.from(transferArgs, "hex"))
  )).map((list) =>
    list.map((a) => ({
      amount: a[0],
      accountId: formatter.ensureBuffer(a[1]),
    }))
  );

  return createTransferHistoryEntry(
    rowId,
    isInput === 1,
    delta,
    asset,
    entryIndex,
    txData,
    args,
    new Date(timestamp),
    txRid,
    blockHeight,
    operationName
  );
}

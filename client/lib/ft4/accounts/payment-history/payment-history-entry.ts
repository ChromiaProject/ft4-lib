import { BufferId } from "../../../cryptoUtils";
import { PaymentHistoryEntry, PaymentHistoryEntryResponse } from "./types";
import { createAmountFromBalance } from "../../asset/amount";
import { formatter, gtv } from "postchain-client";
import { Buffer } from "buffer";

export function createPaymentHistoryEntry(
  rowid: string,
  isInput: boolean,
  delta: bigint,
  decimals: number,
  assetName: string,
  assetId: BufferId,
  entryIndex: number,
  data: Buffer | string,
  transferArgs: { amount: bigint; accountId: BufferId }[][],
  timestamp: Date | number,
  transactionId: BufferId,
  blockHeight: number,
  operationName: string
): PaymentHistoryEntry {
  const txArgs = transferArgs.map((list) =>
    list.map((a) => ({
      amount: createAmountFromBalance(a.amount, decimals),
      accountId: formatter.ensureBuffer(a.accountId),
    }))
  );
  return Object.freeze({
    rowid,
    isInput,
    delta: createAmountFromBalance(delta, decimals),
    asset: { name: assetName, id: formatter.ensureBuffer(assetId) },
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

export function createPaymentHistoryEntryFromResponse(
  responseEntry: PaymentHistoryEntryResponse
): PaymentHistoryEntry {
  const {
    id: rowId,
    delta,
    decimals,
    asset: assetName,
    asset_id: assetId,
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

  return createPaymentHistoryEntry(
    rowId,
    isInput === 1,
    delta,
    decimals,
    assetName,
    assetId,
    entryIndex,
    txData,
    args,
    new Date(timestamp),
    txRid,
    blockHeight,
    operationName
  );
}

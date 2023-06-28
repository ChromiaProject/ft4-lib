import { BufferId } from "../../../cryptoUtils";
import {
  PaymentHistoryEntry,
  PaymentHistoryEntryResponse,
  PaymentHistoryJSON,
  PaymentHistoryTransferArgs,
} from "./types";
import { createAmountFromBalance } from "../../asset/amount";
import { formatter, gtv } from "postchain-client";

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
  blockHeight: number
  //brid: BufferId
): PaymentHistoryEntry {
  const txArgs = transferArgs.map((list) =>
    list.map((a) => ({
      amount: createAmountFromBalance(a.amount, decimals),
      accountId: formatter.ensureBuffer(a.accountId),
    }))
  );
  //eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return Object.freeze({
    rowid: rowid,
    isInput: isInput,
    delta: createAmountFromBalance(delta, decimals),
    asset: { name: assetName, id: formatter.ensureBuffer(assetId) },
    entryIndex: entryIndex,
    data: formatter.ensureBuffer(data),
    transferInputArgs: txArgs[0],
    transferOutputArgs: txArgs[1],
    timestamp: typeof timestamp === "number" ? new Date(timestamp) : timestamp,
    transactionId: formatter.ensureBuffer(transactionId),
    blockHeight: blockHeight,
    //brid: formatter.ensureBuffer(brid),
  });
}

export function getTransferArgs(
  phe: PaymentHistoryEntry
): readonly PaymentHistoryTransferArgs[][] {
  return Object.freeze([phe.transferInputArgs, phe.transferOutputArgs]);
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
    blockHeight
  );
}

export function paymentHistoryEntryToJSON(phe: PaymentHistoryEntry): string {
  const {
    rowid,
    isInput,
    delta,
    asset,
    entryIndex,
    data,
    transferInputArgs,
    transferOutputArgs,
    timestamp,
    transactionId,
    blockHeight,
    //brid,
  } = phe;
  const txArgs = [transferInputArgs, transferOutputArgs].map((list) =>
    list.map((a) => ({
      amount: a.amount,
      accountId: a.accountId.toString("hex"),
    }))
  );
  return JSON.stringify({
    rowid,
    isInput,
    delta: delta.value.toString(),
    decimals: delta.decimals,
    assetName: asset.name,
    assetId: asset.id.toString("hex"),
    entryIndex,
    data: data.toString("hex"),
    transferArgs: txArgs,
    timestamp: timestamp.getTime(),
    transactionId: transactionId.toString("hex"),
    blockHeight,
    //brid: brid.toString("hex"),
  });
}

export function paymentHistoryEntryFromJSON(
  json: string | PaymentHistoryJSON
): PaymentHistoryEntry {
  const {
    rowid,
    isInput,
    delta,
    decimals,
    assetName,
    assetId,
    entryIndex,
    data,
    transferArgs,
    timestamp,
    transactionId,
    blockHeight,
  } = typeof json === "string" ? JSON.parse(json) : json;
  return createPaymentHistoryEntry(
    rowid,
    isInput,
    BigInt(delta),
    decimals,
    assetName,
    assetId,
    entryIndex,
    data,
    transferArgs,
    timestamp,
    transactionId,
    blockHeight
  );
}

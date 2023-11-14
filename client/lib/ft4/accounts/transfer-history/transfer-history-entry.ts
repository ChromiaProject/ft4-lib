import { TransferHistoryEntry, TransferHistoryEntryResponse } from "./types";
import { createAmountFromBalance } from "../../asset/amount";
import { formatter, gtv } from "postchain-client";
import { Buffer } from "buffer";
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
    })),
  );

  const txArgs = args.map((list) =>
    list.map((a) => ({
      amount: createAmountFromBalance(a.amount, asset.decimals),
      accountId: formatter.ensureBuffer(a.accountId),
    })),
  );
  return Object.freeze({
    rowid,
    isInput: isInput === 1,
    delta: createAmountFromBalance(delta, asset.decimals),
    asset: { name: asset.name, id: formatter.ensureBuffer(asset.id) },
    assetData: createAssetObject(asset),
    entryIndex,
    data: formatter.ensureBuffer(txData),
    transferInputArgs: txArgs[0],
    transferOutputArgs: txArgs[1],
    timestamp: new Date(timestamp),
    transactionId: formatter.ensureBuffer(txRid),
    blockHeight,
    operationName,
  });
}

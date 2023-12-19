import { Amount } from "../../asset/interfaces";
import { Buffer } from "buffer";
import { Asset, AssetResponse } from "../../asset/types";

export class TransferHistoryError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "TransferHistoryError";
  }
}

export type TransferHistoryEntryResponse = {
  id: number;
  delta: bigint;
  asset_data: AssetResponse;
  is_input: number;
  timestamp: number;
  block_height: number;
  entry_index: number;
  tx_rid: Buffer;
  tx_data: string;
  operation_name: string;
};

export type TransferHistoryEntry = {
  rowid: number;
  isInput: boolean;
  delta: Amount;
  assetData: Asset;
  entryIndex: number;
  data: Buffer;
  timestamp: Date;
  transactionId: Buffer;
  blockHeight: number;
  operationName: string;
};

export enum TransferHistoryType {
  Sent = 0,
  Received = 1,
}

export type TransferHistoryFilter = {
  transferHistoryType?: TransferHistoryType;
};

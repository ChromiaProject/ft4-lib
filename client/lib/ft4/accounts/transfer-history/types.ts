import { Buffer } from "buffer";
import { Amount, Asset, AssetResponse } from "@ft4/asset";

export type RawTransferDetail = {
  blockchain_rid: Buffer;
  account_id: Buffer;
  asset_id: Buffer;
  delta: bigint;
  is_input: number;
};

export class TransferHistoryError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "TransferHistoryError";
  }
}

export type TransferHistoryEntryResponse = {
  rowid: number;
  id: number;
  delta: bigint;
  asset: AssetResponse;
  is_input: number;
  timestamp: number;
  block_height: number;
  tx_rid: Buffer;
  tx_data: string;
  operation_name: string;
  op_index: number;
  is_crosschain: number;
};

export type TransferHistoryEntry = {
  rowid: number;
  isInput: boolean;
  delta: Amount;
  asset: Asset;
  data: Buffer;
  timestamp: Date;
  transactionId: Buffer;
  blockHeight: number;
  operationName: string;
  opIndex: number;
  isCrosschain: boolean;
};

export type CrosschainTransferhistoryEntryResponse = {
  rowid: number;
  blockchain_rid: Buffer;
  account_id: Buffer;
  asset_id: Buffer;
  delta: bigint;
  is_input: boolean;
  op_index: number;
  transaction_rid: Buffer;
};

export type CrosschainTransferHistoryEntry = {
  rowid: number;
  blockchainRid: Buffer;
  accountId: Buffer;
  assetId: Buffer;
  delta: bigint;
  isInput: boolean;
  opIndex: number;
  transactionId: Buffer;
};

export enum TransferHistoryType {
  Sent = 0,
  Received = 1,
}

export type TransferHistoryFilter = {
  transferHistoryType?: TransferHistoryType;
};

export type TransferDetail = {
  blockchainRid: Buffer;
  accountId: Buffer;
  assetId: Buffer;
  delta: bigint;
  isInput: boolean;
};

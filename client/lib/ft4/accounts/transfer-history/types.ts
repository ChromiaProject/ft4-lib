import { Amount } from "../../asset/interfaces";
import { PageCursor } from "../../types";
import { Buffer } from "buffer";

type TransferHistoryTransferArgs = {
  amount: Amount;
  accountId: Buffer;
};

export type TransferHistoryEntryResponse = {
  id: number;
  delta: bigint;
  decimals: number;
  asset: string;
  asset_id: Buffer;
  is_input: number;
  timestamp: number;
  block_height: number;
  entry_index: number;
  transfer_args: string;
  tx_rid: Buffer;
  tx_data: string;
  operation_name: string;
};

export type TransferHistoryEntry = {
  rowid: number;
  isInput: boolean;
  delta: Amount;
  asset: AssetInfo;
  entryIndex: number;
  data: Buffer;
  transferInputArgs: TransferHistoryTransferArgs[];
  transferOutputArgs: TransferHistoryTransferArgs[];
  timestamp: Date;
  transactionId: Buffer;
  blockHeight: number;
  operationName: string;
};

export type TransferHistoryResponse = {
  data: TransferHistoryEntry[];
  nextCursor: PageCursor | null;
};

type AssetInfo = {
  name: string;
  id: Buffer;
};

export enum TransferHistoryType {
  Sent = 0,
  Received = 1,
}

export type TransferHistoryFilter = {
  transferHistoryType?: TransferHistoryType;
};

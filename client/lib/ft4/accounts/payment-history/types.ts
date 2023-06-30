import { Amount } from "../../asset/interfaces";
import { PageCursor } from "../../types";
import { Buffer } from "buffer";

type PaymentHistoryTransferArgs = {
  amount: Amount;
  accountId: Buffer;
};

export type PaymentHistoryEntryResponse = {
  id: string;
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

export type PaymentHistoryEntry = {
  rowid: string;
  isInput: boolean;
  delta: Amount;
  asset: AssetInfo;
  entryIndex: number;
  data: Buffer;
  transferInputArgs: PaymentHistoryTransferArgs[];
  transferOutputArgs: PaymentHistoryTransferArgs[];
  timestamp: Date;
  transactionId: Buffer;
  blockHeight: number;
  operationName: string;
  //brid: Buffer;
};

export type TransferHistoryResponse = {
  data: PaymentHistoryEntry[];
  nextCursor: PageCursor | null;
};

type AssetInfo = {
  name: string;
  id: Buffer;
};

export enum PaymentHistoryType {
  Sent = 0,
  Received = 1,
}

export type PaymentHistoryFilter = {
  paymentHistoryType?: PaymentHistoryType;
};

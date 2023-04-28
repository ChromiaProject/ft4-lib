import { Amount } from "../../asset/interfaces";

export type PaymentHistoryTransferArgs = {
  amount: number;
  accountId: Buffer;
};

export type PaymentHistoryEntryResponse = [
  id: string,
  delta: bigint,
  decimals: number,
  asset: string,
  asset_id: Buffer,
  is_input: number,
  timestamp: number,
  block_height: number,
  entry_index: number,
  transfer_args: string,
  tx_rid: Buffer,
  tx_data: string
];

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
  //brid: Buffer;
};

export type AssetInfo = {
  name: string;
  id: Buffer;
};

export type PaymentHistoryCursor = [number?, string?];

export type PaymentHistoryJSON = {
  rowid: string;
  isInput: boolean;
  delta: string;
  decimals: number;
  assetName: string;
  assetId: string;
  entryIndex: number;
  data: string;
  transferArgs: {
    amount: number;
    accountId: string;
  }[][];
  timestamp: number;
  transactionId: string;
  blockHeight: number;
  //brid: brid.toString("hex"),
};

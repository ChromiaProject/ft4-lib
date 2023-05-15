export type PaymentHistoryTransferArgs = {
  amount: number;
  accountId: Buffer;
};

export type PaymentHistoryEntryResponse = [
  id: string,
  delta: bigint,
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
  delta: bigint;
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

export enum PaymentHistoryType {
  Sent = 0,
  Received = 1,
}

export type PaymentHistoryFilter = {
  paymentHistoryType?: PaymentHistoryType;
};

export type PaymentHistoryJSON = {
  rowid: string;
  isInput: boolean;
  delta: bigint;
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

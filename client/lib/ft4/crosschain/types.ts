export type PendingTransfer = {
  txRid: Buffer;
  opIndex: number;
  accountId: Buffer;
};

export type PendingTransferResponse = {
  tx_rid: Buffer;
  op_index: number;
  account_id: Buffer;
};

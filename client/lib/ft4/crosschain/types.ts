import { RawGtv } from "postchain-client";
import { Buffer } from "buffer";

type GtxOperation = {
  name: string;
  args: RawGtv[];
};

type GtxTransactionBody = {
  blockchain_rid: Buffer;
  operations: GtxOperation[];
  signers: Buffer[];
};

export type GtxTransaction = {
  body: GtxTransactionBody;
  signatures: Buffer[];
};

export type InitTransferArgs = [
  receiverId: Buffer,
  assetId: Buffer,
  amount: bigint,
  hops: Buffer[],
];

import { Buffer } from "buffer";

export type GtvInitTransferArgs = [
  receiverId: Buffer,
  assetId: Buffer,
  amount: bigint,
  hops: Buffer[],
];

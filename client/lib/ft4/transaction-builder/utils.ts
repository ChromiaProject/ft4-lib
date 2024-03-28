import { GTX, gtx } from "postchain-client";

export const EMPTY_SIGNATURE = Buffer.alloc(64);

export function txDigest(tx: GTX): Buffer {
  return gtx.getDigestToSign({
    blockchainRid: tx.blockchainRid,
    signers: tx.signers,
    operations: tx.operations,
  });
}

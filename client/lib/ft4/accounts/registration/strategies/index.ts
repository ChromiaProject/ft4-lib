import { gtv } from "postchain-client";

export function getAccountIdFromSigners(signers: Buffer[]): Buffer {
  if (!signers.length)
    throw new Error("Cannot derive account id. Signers list is empty");

  return gtv.gtvHash(signers.length === 1 ? signers[0] : signers);
}

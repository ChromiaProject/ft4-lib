import { KeyStore, Signer } from "@ft4/authentication";
import { GTX, RawGtx } from "postchain-client";

export interface FtSigner extends Signer {
  pubKey: Buffer;
}

export interface FtKeyStore extends KeyStore, FtSigner {
  pubKey: Buffer;
  sign(transaction: GTX | RawGtx): Promise<Buffer>;
}

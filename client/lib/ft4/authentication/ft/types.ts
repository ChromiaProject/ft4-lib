
import { KeyStore } from "@ft4/authentication";
import { GTX } from "postchain-client";

export interface FtKeyStore extends KeyStore {
  pubKey: Buffer;
  sign(transaction: GTX): Promise<Buffer>;
}
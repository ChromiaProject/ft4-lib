import { KeyPair } from "postchain-client";

export interface LoginKeyStore {
  clear(accountId: Buffer);
  getKeyPair(accountId: Buffer): Promise<KeyPair | null>;
  createKeyPair(accountId: Buffer): Promise<KeyPair>;
}

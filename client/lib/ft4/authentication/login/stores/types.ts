import { Buffer } from "buffer";
import { FtKeyStore } from "@ft4/authentication";

export interface LoginKeyStore {
  clear(accountId: Buffer): Promise<void>;
  getKeyStore(accountId: Buffer): Promise<FtKeyStore | null>;
  generateKey(accountId: Buffer): Promise<FtKeyStore>;
}

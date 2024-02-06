import { FtKeyStore } from "@ft4/authentication/ft";

export interface LoginKeyStore {
  clear(accountId: Buffer);
  getKeyStore(accountId: Buffer): Promise<FtKeyStore | null>;
  generateKey(accountId: Buffer): Promise<FtKeyStore>;
}

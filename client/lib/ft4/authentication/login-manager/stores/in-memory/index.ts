import { LoginKeyStore } from "../types";
import { KeyPair } from "/cryptoUtils";

export function createInMemoryLoginKeyStore(): LoginKeyStore {
  const accountIdKeyPairMap = new Map<Buffer, KeyPair>();
  return Object.freeze({
    clear: (accountId: Buffer) => {
      accountIdKeyPairMap.delete(accountId);
    },
    getKeyPair: (accountId: Buffer) =>
      Promise.resolve(accountIdKeyPairMap.get(accountId)),
    createKeyPair: (accountId: Buffer) => {
      if (accountIdKeyPairMap.get(accountId)) {
        throw new Error(
          `KeyPair already exists for account <${accountId.toString("hex")}>`
        );
      }

      const keyPair = new KeyPair();
      accountIdKeyPairMap.set(accountId, keyPair);
      return Promise.resolve(keyPair);
    },
  });
}

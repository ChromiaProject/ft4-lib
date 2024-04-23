import { LoginKeyStore, createInMemoryFtKeyStore } from "@ft4/authentication";
import { Buffer } from "buffer";
import { KeyPair, encryption } from "postchain-client";

export function createInMemoryLoginKeyStore(): LoginKeyStore {
  const accountIdKeyPairMap = new Map<string, KeyPair>();

  function clear(accountId: Buffer): Promise<void> {
    accountIdKeyPairMap.delete(accountId.toString("hex"));
    return Promise.resolve();
  }

  return Object.freeze({
    clear,
    getKeyStore: (accountId: Buffer) => {
      const keyPair = accountIdKeyPairMap.get(accountId.toString("hex"));
      if (!keyPair) return Promise.resolve(null);
      return Promise.resolve(createInMemoryFtKeyStore(keyPair));
    },
    generateKey: async (accountId: Buffer) => {
      await clear(accountId);
      if (accountIdKeyPairMap.get(accountId.toString("hex"))) {
        throw new Error(
          `KeyPair already exists for account <${accountId.toString("hex")}>`,
        );
      }

      const keyPair = encryption.makeKeyPair();
      accountIdKeyPairMap.set(accountId.toString("hex"), keyPair);
      return Promise.resolve(createInMemoryFtKeyStore(keyPair));
    },
  });
}

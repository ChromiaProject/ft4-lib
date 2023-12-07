import { KeyPair, encryption } from "postchain-client";
import { LoginKeyStore } from "../types";

export function createInMemoryLoginKeyStore(): LoginKeyStore {
  const accountIdKeyPairMap = new Map<Buffer, KeyPair>();
  return Object.freeze({
    clear: (accountId: Buffer) => {
      accountIdKeyPairMap.delete(accountId);
    },
    getKeyPair: (accountId: Buffer) =>
      Promise.resolve(accountIdKeyPairMap.get(accountId) || null),
    createKeyPair: (accountId: Buffer) => {
      if (accountIdKeyPairMap.get(accountId)) {
        throw new Error(
          `KeyPair already exists for account <${accountId.toString("hex")}>`,
        );
      }

      const keyPair = encryption.makeKeyPair();
      accountIdKeyPairMap.set(accountId, keyPair);
      return Promise.resolve(keyPair);
    },
  });
}

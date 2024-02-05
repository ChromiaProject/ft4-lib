import { KeyPair, encryption } from "postchain-client";
import { LoginKeyStore } from "../types";

export function createInMemoryLoginKeyStore(): LoginKeyStore {
  const accountIdKeyPairMap = new Map<string, KeyPair>();
  return Object.freeze({
    clear: (accountId: Buffer) => {
      accountIdKeyPairMap.delete(accountId.toString("hex"));
    },
    getKeyPair: (accountId: Buffer) =>
      Promise.resolve(
        accountIdKeyPairMap.get(accountId.toString("hex")) || null,
      ),
    createKeyPair: (accountId: Buffer) => {
      if (accountIdKeyPairMap.get(accountId.toString("hex"))) {
        throw new Error(
          `KeyPair already exists for account <${accountId.toString("hex")}>`,
        );
      }

      const keyPair = encryption.makeKeyPair();
      accountIdKeyPairMap.set(accountId.toString("hex"), keyPair);
      return Promise.resolve(keyPair);
    },
  });
}

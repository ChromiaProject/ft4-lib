import { LoginKeyStore, createInMemoryFtKeyStore } from "@ft4/authentication";
import { Connection } from "@ft4/ft-session";
import { Buffer } from "buffer";
import { BufferId, encryption, IClient } from "postchain-client";

const STORAGE_KEY = "FT_LOGIN_KEY_STORE";

export function createBrowserLoginKeyStore(
  storage: Storage,
  merkleHashVersion: number | IClient | Connection,
): LoginKeyStore {
  function loadData(): { [key: string]: string } {
    const loadedData = storage.getItem(STORAGE_KEY);
    if (!loadedData) {
      return {};
    }

    const parsedData = JSON.parse(loadedData) as {
      [key: string]: string;
    };
    return parsedData || {};
  }

  function saveData(data: { [key: string]: string }) {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clear(accountId: Buffer): Promise<void> {
    const values = loadData();
    delete values[ensureString(accountId)];
    saveData(values);

    return Promise.resolve();
  }

  return Object.freeze({
    clear,
    getKeyStore: (accountId: Buffer) => {
      const privateKey = loadData()[ensureString(accountId)];
      if (!privateKey) return Promise.resolve(null);
      return Promise.resolve(
        createInMemoryFtKeyStore(
          encryption.makeKeyPair(privateKey),
          merkleHashVersion,
        ),
      );
    },
    generateKey: async (accountId: Buffer) => {
      await clear(accountId);
      const values = loadData();
      const accountIdString = ensureString(accountId);
      if (accountIdString in values) {
        throw new Error(
          `KeyPair already exists for account <${accountIdString}>`,
        );
      }

      const keyPair = encryption.makeKeyPair();
      values[accountIdString] = ensureString(keyPair.privKey);
      saveData(values);
      return Promise.resolve(
        createInMemoryFtKeyStore(keyPair, merkleHashVersion),
      );
    },
  });
}

function ensureString(bufferId: BufferId): string {
  return typeof bufferId === "string" ? bufferId : bufferId.toString("hex");
}

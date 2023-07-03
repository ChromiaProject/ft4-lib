import { LoginKeyStore } from "../types";
import { BufferId, KeyPair } from "/cryptoUtils";

const STORAGE_KEY = "FT_LOGIN_KEY_STORE";

export function createBrowserLoginKeyStore(storage: Storage): LoginKeyStore {
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

  return Object.freeze({
    clear: (accountId: Buffer) => {
      const values = loadData();
      delete values[ensureString(accountId)];
      saveData(values);
    },
    getKeyPair: (accountId: Buffer) => {
      const privateKey = loadData()[ensureString(accountId)];
      return Promise.resolve(new KeyPair(privateKey));
    },
    createKeyPair: (accountId: Buffer) => {
      const values = loadData();
      const accountIdString = ensureString(accountId);
      if (accountIdString in values) {
        throw new Error(
          `KeyPair already exists for account <${accountIdString}>`
        );
      }

      const keyPair = new KeyPair();
      values[accountIdString] = ensureString(keyPair.privKey);
      saveData(values);
      return Promise.resolve(keyPair);
    },
  });
}

function ensureString(bufferId: BufferId): string {
  return typeof bufferId === "string" ? bufferId : bufferId.toString("hex");
}

import { createBrowserLoginKeyStore } from "../abstract-browser-storage";
import { LoginKeyStore } from "../types";

export function createLocalStorageLoginKeyStore(): LoginKeyStore {
  return createBrowserLoginKeyStore(localStorage);
}

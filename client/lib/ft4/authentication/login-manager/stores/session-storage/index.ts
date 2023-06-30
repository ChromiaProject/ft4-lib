import { createBrowserLoginKeyStore } from "../abstract-browser-storage";
import { LoginKeyStore } from "../types";

export function createSessionStorageKeyStore(): LoginKeyStore {
  return createBrowserLoginKeyStore(sessionStorage);
}

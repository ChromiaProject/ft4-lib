import { createBrowserLoginKeyStore } from "../abstract-browser-storage";
import { LoginKeyStore } from "../types";

export function createSessionStorageLoginKeyStore(): LoginKeyStore {
  return createBrowserLoginKeyStore(sessionStorage);
}

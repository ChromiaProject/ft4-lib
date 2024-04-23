import { LoginKeyStore } from "@ft4/authentication";
import { createBrowserLoginKeyStore } from "./browser-login-keystore";

export function createLocalStorageLoginKeyStore(): LoginKeyStore {
  return createBrowserLoginKeyStore(localStorage);
}

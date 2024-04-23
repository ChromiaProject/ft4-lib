import { LoginKeyStore } from "@ft4/authentication";
import { createBrowserLoginKeyStore } from "./browser-login-keystore";

export function createSessionStorageLoginKeyStore(): LoginKeyStore {
  return createBrowserLoginKeyStore(sessionStorage);
}

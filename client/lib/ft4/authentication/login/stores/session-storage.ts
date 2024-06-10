import { LoginKeyStore } from "@ft4/authentication";
import { createBrowserLoginKeyStore } from "./browser-login-keystore";

/**
 * Creates a `LoginKeyStore` which will keep its keys in the browsers session storage.
 * Suitable when the key should be persisted across page reloads, but be destroyed
 * when the user closes their browser window. Can only be used when the dApp runs in
 * a browser or browser like context.
 */
export function createSessionStorageLoginKeyStore(): LoginKeyStore {
  return createBrowserLoginKeyStore(sessionStorage);
}

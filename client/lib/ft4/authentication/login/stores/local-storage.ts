import { LoginKeyStore } from "@ft4/authentication";
import { createBrowserLoginKeyStore } from "./browser-login-keystore";

/**
 * Creates a `LoginKeyStore` which will keep its keys in the browsers local storage.
 * Suitable when the key should be persisted across page reloads, as well as when
 * the user closes their browser window. Can only be used when the dApp runs in
 * a browser or browser like context.
 * @remarks Using this function does not guarantee that the user will remain logged
 * in after restarting their browser, e.g., if they are running in incognito mode.
 */
export function createLocalStorageLoginKeyStore(): LoginKeyStore {
  return createBrowserLoginKeyStore(localStorage);
}

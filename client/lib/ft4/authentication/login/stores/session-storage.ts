import { LoginKeyStore } from "@ft4/authentication";
import { createBrowserLoginKeyStore } from "./browser-login-keystore";
import { Connection } from "@ft4/ft-session";
import { IClient } from "postchain-client";

/**
 * Creates a `LoginKeyStore` which will keep its keys in the browsers session storage.
 * Suitable when the key should be persisted across page reloads, but be destroyed
 * when the user closes their browser window. Can only be used when the dApp runs in
 * a browser or browser like context.
 * @param merkleHashVersion - the merkle hash version to use for the key store,
 *                            or a client or connection to get the merkle hash version from
 */
export function createSessionStorageLoginKeyStore(
  merkleHashVersion: number | IClient | Connection,
): LoginKeyStore {
  return createBrowserLoginKeyStore(sessionStorage, merkleHashVersion);
}

import { FtKeyStore } from "@ft4/authentication";
import { Connection } from "@ft4/ft-session";
import { BufferId } from "postchain-client";

/**
 * Holds disposable keys associated with various accounts.
 */
export interface LoginKeyStore {
  /**
   * Removes the stored keypair for a specified account
   * @param accountId - the id of the account for which to remove the keypair
   */
  clear(accountId: BufferId): Promise<void>;
  /**
   * Returns a keystore which contains the stored key
   * for this account id.
   * @param accountId - the id of the account of which to get the keystore for
   */
  getKeyStore(accountId: BufferId): Promise<FtKeyStore | null>;
  /**
   * Generates a new key for the specified account id and stores
   * it in this login key store. It does not add the key to the
   * account on the blockchain.
   * @param accountId - the id of the account for which to generate a new key
   */
  generateKey(accountId: BufferId): Promise<FtKeyStore>;
  /**
   * Cleans up any old login session found removing the auth descriptors
   * from the account and the keypair from this LoginKeyStore.
   * @param accountId - the id of the account to cleanup for.
   * @param connection - the connection to the blockchain where the cleanup
   * needs to happen
   */
  cleanup(accountId: BufferId, connection: Connection): Promise<void>;
}

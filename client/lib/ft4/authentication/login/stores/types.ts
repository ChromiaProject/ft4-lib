import { Buffer } from "buffer";
import { FtKeyStore } from "@ft4/authentication";

/**
 * Holds disposable keys associated with various accounts.
 */
export interface LoginKeyStore {
  /**
   * Removes the stored keypair for a specified account
   * @param accountId - the id of the account for which to remove the keypair
   */
  clear(accountId: Buffer): Promise<void>;
  /**
   * Returns a keystore which contains the stored key
   * for this account id.
   * @param accountId - the id of the account of which to get the keystore for
   */
  getKeyStore(accountId: Buffer): Promise<FtKeyStore | null>;
  /**
   * Generates a new key for the specified account id and stores
   * it in this login key store. It does not add the key to the
   * account on the blockchain.
   * @param accountId - the id of the account for which to generate a new key
   */
  generateKey(accountId: Buffer): Promise<FtKeyStore>;
}

import { KeyStore } from "@ft4/authentication";
import { MerkleHashVersionSource } from "@ft4/utils";
import { GTX, RawGtx } from "postchain-client";

/**
 * The FtSigner interface represents an instance
 * of a `Signer` that uses Ft signatures to sign transactions.
 */
export interface FtSigner {
  pubKey: Buffer;
}

/**
 * Represents a key store which holds an ft key
 */
export interface FtKeyStore extends KeyStore, FtSigner {
  pubKey: Buffer;
  /**
   * Signs a transaction
   * @param transaction - the transaction to sign
   * @param merkleHashVersionSource - the source of the merkle hash version
   * @returns the signed transaction, serialized to a `Buffer`
   */
  sign(
    transaction: GTX | RawGtx,
    merkleHashVersionSource: MerkleHashVersionSource,
  ): Promise<Buffer>;
}

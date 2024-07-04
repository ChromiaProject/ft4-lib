import { KeyStore } from "@ft4/authentication";

export type Signature = {
  r: Buffer;
  s: Buffer;
  v: number;
};

export type RawSignature = [r: Buffer, s: Buffer, v: number];

/**
 * The EvmSigner interface represents an instance
 * of a `Signer` that uses Evm signatures to sign transactions.
 */
export interface EvmSigner {
  address: Buffer;
}

/**
 * Represents a key store which holds an evm key
 */
export interface EvmKeyStore extends KeyStore, EvmSigner {
  address: Buffer;
  /**
   * Signs an auth message
   * @param message - the message to sign
   */
  signMessage(message: string): Promise<Signature>;
}

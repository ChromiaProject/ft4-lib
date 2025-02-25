import { BufferId, Operation, formatter } from "postchain-client";
import { ethers } from "ethers";
import { Buffer } from "buffer";
import { EvmKeyStore, EvmSigner, RawSignature, Signature } from "./types";
import { Signer } from "@ft4/authentication";

export const EVM_AUTH = "ft4.evm_auth";

/**
 * Creates a `ft4.evm_auth` operation object from the provided data
 * @param accountId - the account id to authorize for
 * @param authDescriptorId - the auth descriptor to authorize with
 * @param signatures - signatures performed by the keys stored in the auth descriptor
 */
export function evmAuth(
  accountId: BufferId,
  authDescriptorId: BufferId,
  signatures: (Signature | null)[],
): Operation {
  return {
    name: EVM_AUTH,
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDescriptorId),
      signatures.map((s) => (s !== null ? toRawSignature(s) : null)),
    ],
  };
}

/**
 * Signs the provided message using the provided signer and produces a Signature object.
 * @param message - the message to sign
 * @param signer - the signer that will sign the message
 */
export async function signMessage(
  message: string,
  signer: ethers.Signer,
): Promise<Signature> {
  return sliceSignature(await signer.signMessage(message));
}

/**
 * Accepts a signature, encoded as a string and converts it into a signature object.
 * @param signature - the signature
 */
export function sliceSignature(signature: string): Signature {
  const { r, s, v } = ethers.Signature.from(signature);
  return {
    r: Buffer.from(r.slice(2), "hex"),
    s: Buffer.from(s.slice(2), "hex"),
    v,
  };
}

/**
 * Creates an `EvmSigner` instance from the specified address
 * @param address - the address to convert to an `EvmSigner`
 */
export function evmSigner(address: BufferId): EvmSigner {
  return {
    address: formatter.ensureBuffer(address),
  };
}

/**
 * Converts a typescript signature into a raw signature, which can be used to send to the blockchain
 * @param signature - the signature to convert
 */
export function toRawSignature(signature: Signature): RawSignature {
  const { r, s, v } = signature;
  return [r, s, v];
}

/**
 * Type assertion function that checks if the specified signer is an `EvmSigner`
 * @param signer - the signer to check
 * @returns true if the specified signer was an `EvmSigner`. Else false.
 */
export function isEvmSigner(signer: Signer): signer is EvmSigner {
  return (signer as EvmSigner).address !== undefined;
}

/**
 * Type assertion function that checks if the specified signer is an `EvmKeyStore`
 * @param keyStore - the signer to check
 * @returns true if the specified signer was an `EvmKeyStore`. Else false.
 */
export function isEvmKeyStore(keyStore: Signer): keyStore is EvmKeyStore {
  return (
    isEvmSigner(keyStore) && (keyStore as EvmKeyStore).signMessage !== undefined
  );
}

export const BLOCKCHAIN_RID_PLACEHOLDER = "{blockchain_rid}";
export const ACCOUNT_ID_PLACEHOLDER = "{account_id}";
export const AUTH_DESCRIPTOR_ID_PLACEHOLDER = "{auth_descriptor_id}";
export const NONCE_PLACEHOLDER = "{nonce}";

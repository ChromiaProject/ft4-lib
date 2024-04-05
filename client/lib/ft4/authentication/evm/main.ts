import { Operation, formatter } from "postchain-client";
import { ethers } from "ethers";
import { Buffer } from "buffer";
import { BufferId } from "@ft4/utils";
import { EvmKeyStore, EvmSigner, RawSignature, Signature } from "./types";
import { Signer } from "@ft4/authentication";

export const EVM_AUTH = "ft4.evm_auth";

export function evmAuth(
  accountId: BufferId,
  authDescriptorId: BufferId,
  signatures: Signature[],
): Operation {
  return {
    name: EVM_AUTH,
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDescriptorId),
      signatures.map(toRawSignature),
    ],
  };
}

export async function signMessage(
  message: string,
  signer: ethers.Signer,
): Promise<Signature> {
  return sliceSignature(await signer.signMessage(message));
}

export function sliceSignature(signature: string): Signature {
  const { r, s, v } = ethers.Signature.from(signature);
  return {
    r: Buffer.from(r.slice(2), "hex"),
    s: Buffer.from(s.slice(2), "hex"),
    v,
  };
}

export function evmSigner(address: BufferId): EvmSigner {
  return {
    address: formatter.ensureBuffer(address),
  };
}

export function toRawSignature(signature: Signature): RawSignature {
  const { r, s, v } = signature;
  return [r, s, v];
}

export function isEvmSigner(signer: Signer): signer is EvmSigner {
  return (signer as EvmSigner).address !== undefined;
}

export function isEvmKeyStore(keyStore: Signer): keyStore is EvmKeyStore {
  return (
    isEvmSigner(keyStore) && (keyStore as EvmKeyStore).signMessage !== undefined
  );
}

export const BLOCKCHAIN_RID_PLACEHOLDER = "{blockchain_rid}";
export const ACCOUNT_ID_PLACEHOLDER = "{account_id}";
export const AUTH_DESCRIPTOR_ID_PLACEHOLDER = "{auth_descriptor_id}";
export const NONCE_PLACEHOLDER = "{nonce}";

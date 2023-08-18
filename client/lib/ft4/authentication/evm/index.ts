import { Operation, formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { KeyStore } from "../types";
import { ethers } from "ethers";
import { Buffer } from "buffer";
import { createEvmKeyHandler } from "./key-handler";

export * from "./key-stores";
export { createEvmKeyHandler };

export function evmAuth(
  accountId: BufferId,
  authDesriptorId: BufferId,
  signatures: Signature[],
): Operation {
  return {
    name: "ft4.evm_auth",
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDesriptorId),
      signatures.map(({ r, s, v }) => [r, s, v]),
    ],
  };
}

export type Signature = {
  r: Buffer;
  s: Buffer;
  v: number;
};

export interface EvmKeyStore extends KeyStore {
  address: Buffer;
  signMessage(message: string): Promise<Signature>;
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

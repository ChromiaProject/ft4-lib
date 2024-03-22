import { Operation, formatter } from "postchain-client";
import { KeyStore } from "..";
import eth from "ethers";
import { Buffer } from "buffer";
import { BufferId } from "@ft4/utils";

export * from "./key-stores";
export { createEvmKeyHandler } from "./key-handler";

export function evmAuth(
  accountId: BufferId,
  authDescriptorId: BufferId,
  signatures: Signature[],
): Operation {
  return {
    name: "ft4.evm_auth",
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDescriptorId),
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
  signer: eth.ethers.Signer,
): Promise<Signature> {
  return sliceSignature(await signer.signMessage(message));
}

export function sliceSignature(signature: string): Signature {
  const { r, s, v } = eth.ethers.Signature.from(signature);
  return {
    r: Buffer.from(r.slice(2), "hex"),
    s: Buffer.from(s.slice(2), "hex"),
    v,
  };
}

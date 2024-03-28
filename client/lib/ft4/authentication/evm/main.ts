import { Operation, formatter } from "postchain-client";
import { ethers } from "ethers";
import { Buffer } from "buffer";
import { BufferId } from "@ft4/utils";
import { Signature } from "./types";

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

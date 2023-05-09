import { formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { Operation } from "../../utils/types";
import { KeyStore } from "../interfaces";
import { ethers } from "ethers";

export function evmAuth(
  accountId: BufferId,
  authDesriptorId: BufferId,
  signatures: Signature[]
): Operation {
  return [
    "ft.evm_auth",
    formatter.ensureBuffer(accountId),
    formatter.ensureBuffer(authDesriptorId),
    signatures.map(({ r, s, v }) => [r, s, v]),
  ];
}

export type Signature = {
  r: Buffer;
  s: Buffer;
  v: number;
};

export interface EVMKeyStore extends KeyStore {
  address: Buffer;
  signMessage(message: string): Promise<Signature>;
}

export async function signMessage(
  message: string,
  signer: ethers.Signer
): Promise<Signature> {
  const signature = await signer.signMessage(message);
  const { r, s, v } = ethers.Signature.from(signature);
  return {
    r: Buffer.from(r.slice(2), "hex"),
    s: Buffer.from(s.slice(2), "hex"),
    v,
  };
}

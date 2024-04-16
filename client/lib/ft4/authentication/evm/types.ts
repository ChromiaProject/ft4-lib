import { KeyStore } from "@ft4/authentication";

export type Signature = {
  r: Buffer;
  s: Buffer;
  v: number;
};

export type RawSignature = [r: Buffer, s: Buffer, v: number];

export interface EvmSigner {
  address: Buffer;
}

export interface EvmKeyStore extends KeyStore, EvmSigner {
  address: Buffer;
  signMessage(message: string): Promise<Signature>;
}

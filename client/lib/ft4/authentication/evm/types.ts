import { KeyStore } from "@ft4/authentication";

export type Signature = {
  r: Buffer;
  s: Buffer;
  v: number;
};

export interface EvmKeyStore extends KeyStore {
  address: Buffer;
  signMessage(message: string): Promise<Signature>;
}
import { Buffer } from "buffer";
import { ethers } from "ethers";
import { KeyPair } from "postchain-client";
import { EvmKeyStore, signMessage } from "..";
import { createEvmKeyHandler } from "../key-handler";
import { AnyAuthDescriptor } from "/ft4/accounts/auth-descriptor/types";

export function createInMemoryEvmKeyStore(keyPair: KeyPair): EvmKeyStore {
  const wallet = new ethers.Wallet(keyPair.privKey.toString("hex"));
  const address = Buffer.from(wallet.address.slice(2), "hex");
  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: false,
    signMessage: (message: string) => signMessage(message, wallet),
    // FIXME
    sign: (digestToSign: Buffer) => Promise.resolve(digestToSign),
    createKeyHandler: (authDescriptor: AnyAuthDescriptor) =>
      createEvmKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}

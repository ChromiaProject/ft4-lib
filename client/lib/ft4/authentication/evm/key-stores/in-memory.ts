import { Buffer } from "buffer";
import { ethers } from "ethers";
import { KeyPair } from "postchain-client";
import { AnyAuthDescriptor } from "@ft4/accounts";
import {
  EvmKeyStore,
  createEvmKeyHandler,
  signMessage,
} from "@ft4/authentication";

export function createInMemoryEvmKeyStore(keyPair: KeyPair): EvmKeyStore {
  const wallet = new ethers.Wallet(keyPair.privKey.toString("hex"));
  const address = Buffer.from(wallet.address.slice(2), "hex");
  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: false,
    signMessage: (message: string) => signMessage(message, wallet),
    createKeyHandler: (authDescriptor: AnyAuthDescriptor) =>
      createEvmKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}

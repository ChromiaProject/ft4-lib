import { EVMKeyStore, signMessage } from "..";
import { KeyPair } from "postchain-client";
import { AuthDescriptor } from "../../../account/auth-descriptor/types";
import { createEVMKeyHandler } from "../key-handler";
import { ethers } from "ethers";
import { Buffer } from "buffer";

export function createInMemoryEVMKeyStore(keyPair: KeyPair): EVMKeyStore {
  const wallet = new ethers.Wallet(keyPair.privKey.toString("hex"));
  const address = Buffer.from(wallet.address.slice(2), "hex");
  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: false,
    signMessage: (message: string) => signMessage(message, wallet),
    // FIXME
    sign: (digestToSign: Buffer) => Promise.resolve(digestToSign),
    createKeyHandler: (authDescriptor: AuthDescriptor) =>
      createEVMKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}

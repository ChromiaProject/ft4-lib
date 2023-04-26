import { KeyPair } from "../../../../cryptoUtils";
import { AuthDescriptor } from "../../../account/auth-descriptor/types";
import { KeyStore } from "../../interfaces";
import { createFTKeyHandler } from "../key-handler";
import { encryption } from "postchain-client";

export function createInMemoryFTKeyStore(keyPair: KeyPair): KeyStore {
  const keyStore = Object.freeze({
    id: keyPair.pubKey,
    pubKey: keyPair.pubKey,
    // Would it be better to receive transaction?
    // If transaction is signed on a different device, it would make sense to be able to display
    // transaction details, so user knows what is being signed.
    sign: (digestToSign: Buffer) => sign(digestToSign, keyPair),
    createKeyHandler: (authDescriptor: AuthDescriptor) =>
      createFTKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}

async function sign(digestToSign: Buffer, keyPair: KeyPair): Promise<Buffer> {
  return encryption.signDigest(digestToSign, keyPair.privKey);
}

import { AuthDescriptor } from "../../../accounts/auth-descriptor/types";
import { createFtKeyHandler } from "../key-handler";
import { FtKeyStore } from "..";
import {
  SignatureProvider,
  newSignatureProvider,
  KeyPair,
} from "postchain-client";
import { Buffer } from "buffer";

export function createInMemoryFtKeyStore(
  keyHolder: KeyPair | SignatureProvider
): FtKeyStore {
  const signatureProvider =
    "privKey" in keyHolder ? newSignatureProvider(keyHolder) : keyHolder;

  const keyStore = Object.freeze({
    id: signatureProvider.pubKey,
    pubKey: signatureProvider.pubKey,
    isInteractive: false,
    // Would it be better to receive transaction?
    // If transaction is signed on a different device, it would make sense to be able to display
    // transaction details, so user knows what is being signed.
    sign: (digestToSign: Buffer) => signatureProvider.sign(digestToSign),
    createKeyHandler: (authDescriptor: AuthDescriptor) =>
      createFtKeyHandler(authDescriptor, keyStore),
  });

  return keyStore;
}

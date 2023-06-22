import { KeyPair } from "../../../../cryptoUtils";
import { AuthDescriptor } from "../../../account/auth-descriptor/types";
import { KeyStore } from "../../interfaces";
import { createFTKeyHandler } from "../key-handler";
import { SignatureProvider, newSignatureProvider } from "postchain-client";

export function createInMemoryFTKeyStore(
  keyHolder: KeyPair | SignatureProvider
): KeyStore {
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
      createFTKeyHandler(authDescriptor, keyStore),
  });

  return keyStore;
}

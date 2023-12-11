import { Buffer } from "buffer";
import {
  KeyPair,
  SignatureProvider,
  newSignatureProvider,
} from "postchain-client";
import { FtKeyStore } from "..";
import { createFtKeyHandler } from "../key-handler";
import { AnyAuthDescriptor } from "@ft4/accounts/auth-descriptor/types";

export function createInMemoryFtKeyStore(
  keyHolder: KeyPair | SignatureProvider,
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
    createKeyHandler: (ad: AnyAuthDescriptor) =>
      createFtKeyHandler(ad, keyStore),
  });

  return keyStore;
}

import {
  KeyPair,
  SignatureProvider,
  newSignatureProvider,
  GTX,
  gtx,
} from "postchain-client";
import { AnyAuthDescriptor } from "@ft4/accounts";
import { FtKeyStore, createFtKeyHandler } from "@ft4/authentication";

export function createInMemoryFtKeyStore(
  keyHolder: KeyPair | SignatureProvider,
): FtKeyStore {
  const signatureProvider =
    "privKey" in keyHolder ? newSignatureProvider(keyHolder) : keyHolder;

  const keyStore = Object.freeze({
    id: signatureProvider.pubKey,
    pubKey: signatureProvider.pubKey,
    isInteractive: false,
    sign: (transaction: GTX) =>
      signatureProvider.sign(gtx.gtxToRawGtxBody(transaction)),
    createKeyHandler: (ad: AnyAuthDescriptor) =>
      createFtKeyHandler(ad, keyStore),
  });

  return keyStore;
}

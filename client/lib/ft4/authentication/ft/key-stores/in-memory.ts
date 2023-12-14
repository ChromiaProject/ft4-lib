import {
  KeyPair,
  SignatureProvider,
  newSignatureProvider,
} from "postchain-client";
import { FtKeyStore } from "..";
import { createFtKeyHandler } from "../key-handler";
import { AnyAuthDescriptor } from "/ft4/accounts/auth-descriptor/types";
import { TxBuilderTransaction } from "/ft4/utils/types";
import { txDigest } from "/ft4/utils/transaction-builder";

export function createInMemoryFtKeyStore(
  keyHolder: KeyPair | SignatureProvider,
): FtKeyStore {
  const signatureProvider =
    "privKey" in keyHolder ? newSignatureProvider(keyHolder) : keyHolder;

  const keyStore = Object.freeze({
    id: signatureProvider.pubKey,
    pubKey: signatureProvider.pubKey,
    isInteractive: false,
    sign: (transaction: TxBuilderTransaction) =>
      signatureProvider.sign(txDigest(transaction)),
    createKeyHandler: (ad: AnyAuthDescriptor) =>
      createFtKeyHandler(ad, keyStore),
  });

  return keyStore;
}

import {
  KeyPair,
  SignatureProvider,
  newSignatureProvider,
  RawGtxBody,
} from "postchain-client";
import { FtKeyStore, createFtKeyHandler } from "..";
import { AnyAuthDescriptor } from "@ft4/accounts";
import { TxBuilderTransaction } from "@ft4/utils/types";

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
      signatureProvider.sign(txBuilderTransactionToRawGtxBody(transaction)),
    createKeyHandler: (ad: AnyAuthDescriptor) =>
      createFtKeyHandler(ad, keyStore),
  });

  return keyStore;
}

function txBuilderTransactionToRawGtxBody(
  tx: TxBuilderTransaction,
): RawGtxBody {
  return [
    tx.blockchainRid,
    tx.operations.map((op) => [op.opName, op.args]),
    tx.signers,
  ];
}

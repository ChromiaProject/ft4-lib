import { Buffer } from "buffer";
import {
  GTX,
  RawGtx,
  SignedTransaction,
  gtx,
  formatter,
} from "postchain-client";
import { Connection } from "@ft4/types";
import { Authenticator, isFtKeyStore } from "@ft4/authentication";
import { EMPTY_SIGNATURE } from "@ft4/transaction-builder/utils";

export async function signTransaction(
  _connection: Connection,
  authenticator: Authenticator,
  tx: GTX | RawGtx | SignedTransaction,
): Promise<SignedTransaction> {
  const gtxTx = Buffer.isBuffer(tx)
    ? gtx.deserialize(tx)
    : Array.isArray(tx)
      ? formatter.rawGtxToGtx(tx)
      : tx;

  if (!Array.isArray(gtxTx.signatures)) {
    throw new Error("No signatures array");
  }

  if (gtxTx.signatures.length != gtxTx.signers.length) {
    throw new Error(
      `signatures.length != signers.length: ${gtxTx.signatures.length} != ${gtxTx.signers.length}`,
    );
  }

  // TODO use isEvmKeyStore
  if (
    gtxTx.signatures.length > 0 &&
    authenticator.keyHandlers.find((kh) => !isFtKeyStore(kh.keyStore))
  ) {
    throw new Error(
      "Cannot add EVM signatures after GTX signature has been added",
    );
  }

  // TODO handle EVM operations

  for (let index = 0; index < gtxTx.signers.length; index++) {
    const keyHandler = authenticator.keyHandlers.find(
      (kh) =>
        isFtKeyStore(kh.keyStore) &&
        kh.keyStore.pubKey.equals(gtxTx.signers[index]),
    );
    if (keyHandler) {
      if (gtxTx.signatures![index].equals(EMPTY_SIGNATURE)) {
        gtxTx.signatures![index] = await keyHandler.sign(gtxTx);
      }
    }
  }

  return gtx.serialize(gtxTx);
}

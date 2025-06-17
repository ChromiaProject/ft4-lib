import {
  KeyPair,
  SignatureProvider,
  newSignatureProvider,
  GTX,
  gtx,
  RawGtx,
  IClient,
} from "postchain-client";
import { AnyAuthDescriptor } from "@ft4/accounts";
import { FtKeyStore, createFtKeyHandler } from "@ft4/authentication";
import { isRawGtx } from "@ft4/utils";
import { getMerkleHashVersion } from "@ft4/utils/main";
import { Connection } from "@ft4/ft-session";

/**
 * Creates an FtKeyStore instance which will only keep the keys in memory. That is,
 * if the app is restarted or reloaded, the keys will be gone. Good for testing or
 * for keys that are ephemeral in nature.
 * @param keyHolder - the object that holds the keys
 */
export function createInMemoryFtKeyStore(
  keyHolder: KeyPair | SignatureProvider,
  merkleHashVersion: IClient | Connection | number,
): FtKeyStore {
  const signatureProvider =
    "privKey" in keyHolder
      ? newSignatureProvider(getMerkleHashVersion(merkleHashVersion), keyHolder)
      : keyHolder;

  const keyStore = Object.freeze({
    id: signatureProvider.pubKey,
    pubKey: signatureProvider.pubKey,
    isInteractive: false,
    sign: (tx: GTX | RawGtx) =>
      signatureProvider.sign(isRawGtx(tx) ? tx[0] : gtx.gtxToRawGtxBody(tx)),
    createKeyHandler: (ad: AnyAuthDescriptor) =>
      createFtKeyHandler(ad, keyStore),
  });

  return keyStore;
}

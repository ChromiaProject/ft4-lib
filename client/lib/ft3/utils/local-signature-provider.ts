import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import {
  makeKeyPair,
  signDigest,
} from "postchain-client/built/src/encryption/encryption";
import { ensureBuffer } from "postchain-client/built/src/formatter";
import { KeyPair } from "postchain-client/built/src/encryption/types";

function storeLocalStoragePrivateKey(privKey?: Buffer | string) {
  const kp = makeKeyPair(privKey);
  localStorage.setItem("__localSigProvPrivKey", kp.privKey.toString("hex"));
}

export function isLocalStorageSignatureProviderEmpty(): boolean {
  return localStorage.getItem("__localSigProvPrivKey") !== null;
}

export function clearLocalStorageSignatureProvider() {
  localStorage.removeItem("__localSigProvPrivKey");
}

export const createLocalStorageSignatureProvider = (
  privKey?: Buffer | string
): SignatureProvider => {
  const priv = localStorage.getItem("__localSigProvPrivKey");
  let kp: KeyPair;
  if (priv) {
    if (privKey) {
      throw new Error(
        "privKey was defined, but localStorage had one already in memory. " +
          "Please clear localStorage before setting a new privKey if you're sure " +
          "you want to lose access to the old key pair."
      );
    }
    kp = makeKeyPair(priv);
  } else {
    kp = makeKeyPair(privKey);
    storeLocalStoragePrivateKey(kp.privKey);
  }

  return Object.freeze({
    pubKey: kp.pubKey,
    sign: async (gtx) => signDigest(gtx, ensureBuffer(kp.privKey)),
  });
};

export const localStorageSignatureProvider = Object.freeze({
  create: createLocalStorageSignatureProvider,
  isEmpty: isLocalStorageSignatureProviderEmpty,
  clear: clearLocalStorageSignatureProvider,
});

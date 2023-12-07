import {
  SignatureProvider,
  KeyPair,
  encryption,
  formatter,
} from "postchain-client";
import { Buffer } from "buffer";
import { getPubkey } from ".";

function storeLocalStoragePrivateKey(privKey?: Buffer | string) {
  const kp = encryption.makeKeyPair(privKey);
  localStorage.setItem("__localSigProvPrivKey", kp.privKey.toString("hex"));
}

export function isLocalStorageSignatureProviderEmpty(): boolean {
  return localStorage.getItem("__localSigProvPrivKey") !== null;
}

export function clearLocalStorageSignatureProvider() {
  localStorage.removeItem("__localSigProvPrivKey");
}

export const createLocalStorageSignatureProvider = (
  privKey?: Buffer | string,
): SignatureProvider => {
  const priv = localStorage.getItem("__localSigProvPrivKey");
  let kp: KeyPair;
  if (priv) {
    if (privKey) {
      throw new SignatureProviderError(
        "privKey was defined, but localStorage had one already in memory. " +
          "Please clear localStorage before setting a new privKey if you're sure " +
          "you want to lose access to the old key pair.",
      );
    }
    kp = encryption.makeKeyPair(priv);
  } else {
    kp = encryption.makeKeyPair(privKey);
    storeLocalStoragePrivateKey(kp.privKey);
  }

  return Object.freeze({
    pubKey: getPubkey(kp),
    sign: async (gtx: Buffer) =>
      encryption.signDigest(gtx, formatter.ensureBuffer(kp.privKey)),
  });
};

export const localStorageSignatureProvider = Object.freeze({
  create: createLocalStorageSignatureProvider,
  isEmpty: isLocalStorageSignatureProviderEmpty,
  clear: clearLocalStorageSignatureProvider,
});

export class SignatureProviderError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "SignatureProviderError";
  }
}

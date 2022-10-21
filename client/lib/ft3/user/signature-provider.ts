import Transaction from "../core/transaction";
import { KeyPair } from "../../cryptoUtils";
import { util } from "postchain-client";

export default interface SignatureProvider {
  sign(transaction: Transaction): Promise<Buffer>;
  readonly pubKey: Buffer;
}

export class InMemorySignatureProvider implements SignatureProvider {
  private readonly keyPair: KeyPair;

  constructor(privateKey?: Buffer | string) {
    this.keyPair = new KeyPair(privateKey);
  }

  async sign(transaction: Transaction): Promise<Buffer> {
    const digestToSign = transaction.getDigestToSign();
    return util.signDigest(digestToSign, this.keyPair.privKey);
  }

  get pubKey(): Buffer {
    return this.keyPair.pubKey;
  }
}

export class LocalStorageSignatureProvider implements SignatureProvider {
  private kp: KeyPair;

  constructor() {
    const pk = localStorage.getItem("__localSigProvPrivKey");
    if (!pk) return;
    this.kp = new KeyPair(pk);
  }

  static get hasPrivateKey(): boolean {
    return localStorage.getItem("__localSigProvPrivKey") !== null;
  }

  storePrivateKey(privKey?: Buffer | string) {
    this.kp = new KeyPair(privKey);
    localStorage.setItem(
      "__localSigProvPrivKey",
      this.kp.privKey.toString("hex")
    );
  }

  async sign(transaction: Transaction): Promise<Buffer> {
    const digestToSign = transaction.getDigestToSign();
    return util.signDigest(digestToSign, this.kp.privKey);
  }

  get pubKey(): Buffer {
    return this.kp.pubKey;
  }

  clear() {
    localStorage.removeItem("__localSigProvPrivKey");
    this.kp = undefined;
  }
}

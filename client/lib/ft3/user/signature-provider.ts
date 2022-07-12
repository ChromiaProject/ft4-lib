import Transaction from "../core/transaction";
import KeyPair from "../../cyptoUtils/keyPair";
import { util } from "postchain-client";

export default interface SignatureProvider {
  sign(transaction: Transaction): Promise<Buffer>;
  readonly pubKey: Buffer;
}

export class BasicSignatureProvider implements SignatureProvider {
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

export class LocalSignatureProvider implements SignatureProvider {
  constructor(privateKey?: Buffer | string) {
    const kp = new KeyPair(privateKey);
    localStorage.setItem("__localSigProvPubKey", kp.pubKey.toString("hex"));
    localStorage.setItem("__localSigProvPrivKey", kp.privKey.toString("hex"));
  }

  async sign(transaction: Transaction): Promise<Buffer> {
    const digestToSign = transaction.getDigestToSign();
    return util.signDigest(
      digestToSign,
      Buffer.from(localStorage.getItem("__localSigProvPrivKey"), "hex")
    );
  }

  get pubKey(): Buffer {
    return Buffer.from(localStorage.getItem("__localSigProvPubKey"), "hex");
  }

  clear() {
    localStorage.removeItem("__localSigProvPubKey");
    localStorage.removeItem("__localSigProvPrivKey");
  }
}

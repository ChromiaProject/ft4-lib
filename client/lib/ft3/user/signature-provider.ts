import Transaction from "../core/transaction";
import KeyPair from "../../cyptoUtils/keyPair";
import { util } from "postchain-client";

export default interface SignatureProvider {
  sign(transaction: Transaction): Buffer;
  readonly pubKey: Buffer;
}

export class BasicSignatureProvider implements SignatureProvider {
  private readonly keyPair: KeyPair;

  constructor(privateKey?: Buffer | string) {
    this.keyPair = new KeyPair(privateKey);
  }

  sign(transaction: Transaction): Buffer {
    const digestToSign = transaction.getDigestToSign();
    return util.signDigest(digestToSign, this.keyPair.privKey);
  }

  get pubKey(): Buffer {
    return this.keyPair.pubKey;
  }
}

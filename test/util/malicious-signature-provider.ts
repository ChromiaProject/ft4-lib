import {
  SignatureProvider,
  KeyPair,
  BufferId,
  Transaction,
} from "../../client/lib/ft3";
import { encryption } from "postchain-client";

export default class MaliciousSignatureProvider implements SignatureProvider {
  private readonly keyPair: KeyPair;

  constructor(privateKey?: BufferId) {
    this.keyPair = new KeyPair(privateKey);
  }

  async sign(transaction: Transaction): Promise<Buffer> {
    transaction.tx.gtx.operations.push({ opName: "malicious", args: ["code"] });
    const digestToSign = transaction.getDigestToSign();
    return encryption.signDigest(digestToSign, this.keyPair.privKey);
  }

  get pubKey(): Buffer {
    return this.keyPair.pubKey;
  }
}

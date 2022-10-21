import {
  SignatureProvider,
  KeyPair,
  BufferId,
  Transaction,
} from "../../client/lib/ft3";
import { util } from "postchain-client";

export default class MaliciousSignatureProvider implements SignatureProvider {
  private readonly keyPair: KeyPair;

  constructor(privateKey?: BufferId) {
    this.keyPair = new KeyPair(privateKey);
  }

  async sign(transaction: Transaction): Promise<Buffer> {
    //@ts-expect-error it's accessing a supposedly private variable
    transaction.tx.gtx.operations.push({ opName: "malicious", args: ["code"] });
    const digestToSign = transaction.getDigestToSign();
    return util.signDigest(digestToSign, this.keyPair.privKey);
  }

  get pubKey(): Buffer {
    return this.keyPair.pubKey;
  }
}

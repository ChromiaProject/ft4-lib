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

/*
  get accountId(): Buffer {
    const accountIdString = localStorage.getItem("__ssoAccountId");

    if (!accountIdString) {
      return null;
    }

    return Buffer.from(accountIdString, "hex");
  }

  set accountId(value: Buffer) {
    localStorage.setItem("__ssoAccountId", value.toString("hex"));
  }

  clearTmp() {
    localStorage.removeItem("__ssoTmpPrivKey");*/

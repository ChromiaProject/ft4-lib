/* eslint-disable @typescript-eslint/no-unused-vars */
import SignatureProvider from "../../client/lib/ft3/user/signature-provider";
import KeyPair from "../../client/lib/cyptoUtils/keyPair";
import Transaction from "../../client/lib/ft3/core/transaction";
import { util } from "postchain-client";
import { op } from "../../client/lib/ft3";
import TransactionBuilder from "../../client/lib/ft3/core/transaction-builder";

export default class MaliciousSignatureProvider implements SignatureProvider {
  private readonly keyPair: KeyPair;
  transactionBuilder: TransactionBuilder;

  constructor(
    transactionBuilder: TransactionBuilder,
    privateKey?: Buffer | string
  ) {
    this.keyPair = new KeyPair(privateKey);
    this.transactionBuilder = transactionBuilder;
  }

  async sign(transaction: Transaction): Promise<Buffer> {
    const tx = this.transactionBuilder
      .add(op("malicious", "code"))
      .build([this.pubKey]);
    const digestToSign = tx.getDigestToSign();
    return util.signDigest(digestToSign, this.keyPair.privKey);
  }

  get pubKey(): Buffer {
    return this.keyPair.pubKey;
  }
}

import SignatureProvider from "../../client/lib/ft3/user/signature-provider";
import KeyPair from "../../client/lib/cyptoUtils/keyPair";
import Transaction from "../../client/lib/ft3/core/transaction";
import { util } from "postchain-client";
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

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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

import Blockchain from "./blockchain/blockchain";
import Transaction from "./transaction";
import Operation from "./operation";
import User from "../user/user";
import { encodeGtv } from "./gtv";

export default class TransactionBuilder {
  private operations: Array<Operation> = [];
  readonly blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.blockchain = blockchain;
  }

  add(operation: Operation): TransactionBuilder {
    this.operations.push(operation);
    return this;
  }

  build(_signers: Buffer[]): Transaction {
    let signers: any[] = [...new Set(_signers.map((s) => s.toString("hex")))]; //filters duplicates
    signers = signers.map((s) => Buffer.from(s, "hex"));

    const tx = this.blockchain.connection.newTransaction(signers);
    this.operations.forEach((o) =>
      tx.addOperation(o.name, ...o.args.map(encodeGtv))
    );
    return new Transaction(tx, this.blockchain);
  }

  async buildAndSign(user: User): Promise<Transaction> {
    return await this.build(user.authDescriptor.signers).sign(
      user.signatureProvider
    );
  }
}

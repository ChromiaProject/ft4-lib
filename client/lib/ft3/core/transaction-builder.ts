import Blockchain from "./blockchain/blockchain";
import Transaction from "./transaction";
import { GtvSerializable } from "../user/account-utils";
import Operation from "./operation";
import User from "../user/user";

declare global {
  interface Array<T> extends GtvSerializable {} //eslint-disable-line @typescript-eslint/no-unused-vars
  interface String extends GtvSerializable {}
  interface Number extends GtvSerializable {}
  interface Buffer extends GtvSerializable {}
  interface Boolean extends GtvSerializable {}
  interface Object extends GtvSerializable {}
}

Buffer.prototype.toGTV = function (): any {
  return this.toString("hex");
};

Object.defineProperty(Array.prototype, "toGTV", {
  enumerable: false,
  value: function (): any[] {
    return this.map((element) =>
      element === null || element === undefined ? null : element.toGTV()
    );
  },
});

String.prototype.toGTV = function (): any {
  return this;
};

Number.prototype.toGTV = function (): any {
  return this;
};

Boolean.prototype.toGTV = function (): any {
  return this ? 1 : 0;
};

Object.defineProperty(Object.prototype, "toGTV", {
  enumerable: false,
  writable: true,
  value: function (): any {
    return this;
  },
});

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
      tx.addOperation(
        o.name,
        ...o.args.map((a) => (a === null || a === undefined ? null : a.toGTV()))
      )
    );
    return new Transaction(tx, this.blockchain);
  }

  async buildAndSign(user: User): Promise<Transaction> {
    return await this.build(user.authDescriptor.signers).sign(
      user.signatureProvider
    );
  }
}

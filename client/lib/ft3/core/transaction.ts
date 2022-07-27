import Blockchain from "./blockchain/blockchain";
import TransactionBuilder from "./transaction-builder";
import { gtx } from "postchain-client";
import { op } from "../user/account-operations";
import SignatureProvider from "../user/signature-provider";
import Operation from "./operation";

export default class Transaction {
  private readonly tx;
  private readonly blockchain: Blockchain;

  constructor(tx, blockchain: Blockchain) {
    this.tx = tx;
    this.blockchain = blockchain;
  }

  get operations(): Operation[] {
    return this.tx.gtx.operations.map(({ opName, args }) =>
      op(opName, ...args)
    );
  }

  async post() {
    await this.tx.postAndWaitConfirmation();
  }

  raw(): Buffer {
    return this.tx.encode();
  }

  static fromRawTransaction(
    rawTransaction: Buffer,
    blockchain: Blockchain
  ): Transaction {
    const deserializedTx = gtx.deserialize(rawTransaction);
    if (deserializedTx.blockchainRID.compare(blockchain.id)) {
      throw new Error(
        `Invalid blockchain ${deserializedTx.blockchainRID.toString(
          "hex"
        )}. Expected blockchain with BRID ${blockchain.id.toString("hex")}`
      );
    }
    const txBuild = new TransactionBuilder(blockchain);

    deserializedTx.operations.map((operation) => {
      txBuild.add(op(operation.opName, ...operation.args));
    });
    const tx = txBuild.build(deserializedTx.signers);
    tx.tx.gtx.signatures = deserializedTx.signatures;
    return tx;
  }

  getTxRID(): Buffer {
    return this.tx.getTxRID();
  }

  getDigestToSign(): Buffer {
    return this.tx.getDigestToSign();
  }

  async sign(provider: SignatureProvider): Promise<Transaction> {
    const signature = await provider.sign(this);
    this.tx.addSignature(provider.pubKey, signature);
    return this;
  }
}

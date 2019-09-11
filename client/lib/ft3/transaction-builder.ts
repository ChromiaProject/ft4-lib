import Blockchain from "./blockchain";
import Transaction from "./transaction";

export default class TransactionBuilder {
    private operations: any[] = [];
    readonly blockchain: Blockchain;

    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;
    }

    addOperation(...args: any[]): TransactionBuilder {
        this.operations.push(args);
        return this;
    }

    build(signers: Buffer[]): Transaction {
        const tx = this.blockchain.connection.gtx.newTransaction(signers);
        this.operations.forEach(operation => tx.addOperation(...operation));
        return new Transaction(tx, this.blockchain);
    }
}
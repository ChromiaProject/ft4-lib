import Blockchain from "./blockchain";
import Transaction from "./transaction";
import {GtvSerializable} from "./account";
import { util } from 'postchain-client'
import Operation from "./operation";
import User from "./user";

declare global {
    interface Array<T> extends GtvSerializable {}
    interface String extends GtvSerializable {}
    interface Number extends GtvSerializable {}
    interface Buffer extends GtvSerializable {}
}

Buffer.prototype.toGTV = function(): any {
    return this.toString('hex');
};

Array.prototype.toGTV = function(): any[] {
    return this.map(element => element.toGTV());
};

String.prototype.toGTV = function(): any {
    return this;
};

Number.prototype.toGTV = function(): any {
    return this;
};

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

    build(signers: Buffer[]): Transaction {
        const tx = this.blockchain.connection.gtx.newTransaction(signers);
        this.operations.forEach(o => tx.addOperation(o.name, ...o.args.map(a => a.toGTV())));
        return new Transaction(tx, this.blockchain);
    }

    buildAndSign(user: User): Transaction {
        return this.build(user.authDescriptor.signers).sign(user.keyPair);
    }
}
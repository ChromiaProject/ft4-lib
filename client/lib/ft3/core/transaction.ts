import Blockchain from "./blockchain/blockchain";
import TransactionBuilder from "./transaction-builder";
import { gtx } from 'postchain-client'
import { op } from '../user/account-operations';
import Operation from "./operation";

export default class Transaction {
    private readonly tx;
    private readonly blockchain: Blockchain;

    constructor(tx, blockchain: Blockchain) {
        this.tx = tx;
        this.blockchain = blockchain;
    }

    get operations(): Operation[] {
        return this.tx.gtx.operations.map(({ opName, args }) => op(opName,  ...args))
    }

    sign(keyPair): Transaction {
        const { privKey, pubKey } = keyPair;
        this.tx.sign(privKey, pubKey);
        return this;
    }

    async post() {
        await this.tx.postAndWaitConfirmation();
    }

    raw(): Buffer {
        return this.tx.encode()
    }

    static fromRawTransaction(rawTransaction: Buffer, blockchain: Blockchain): Transaction {
        const deserializedTx = gtx.deserialize(rawTransaction);
        const txBuild = new TransactionBuilder(blockchain);
    
        deserializedTx.operations.map(operation => {
            txBuild.add(op(operation.opName, ...operation.args));
        });
        const tx = txBuild.build(deserializedTx.signers);
        tx.tx.gtx.signatures = deserializedTx.signatures;
        return tx;
    }
} 
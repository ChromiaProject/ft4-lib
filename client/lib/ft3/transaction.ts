import Blockchain from "./blockchain";

export default class Transaction {
    private readonly tx;
    private readonly blockchain: Blockchain;

    constructor(tx, blockchain: Blockchain) {
        this.tx = tx;
        this.blockchain = blockchain;
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
} 
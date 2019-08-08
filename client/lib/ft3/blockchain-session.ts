import Blockchain from "./blockchain";
import User from "./user";
import { Account } from "./account";

export default class BlockchainSession {
    readonly user: User;
    readonly blockchain: Blockchain;

    constructor(user: User, blockchain: Blockchain) {
        this.user = user;
        this.blockchain = blockchain;
    }

    async getAccountById(id: Buffer): Promise<Account> {
        return await Account.getById(id, this);
    }

    async getAccountsByParticipantId(id: Buffer): Promise<Account[]> {
        return await Account.getByParticipantId(id, this);
    }

    async getAccountsByAuthDescriptorId(id: Buffer): Promise<Account[]> {
        return await Account.getByAuthDescriptorId(id , this);
    }

    async query(name: string, params: any): Promise<any> {
        return await this.blockchain.query(name, params);
    }

    async execute(...args: any): Promise<any> {
        return await this.blockchain
            .transactionBuilder()
            .addOperation(...args)
            .build(this.user.authDescriptor.signers)
            .sign(this.user.keyPair)
            .post();
    }
}
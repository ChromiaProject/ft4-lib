import BlockchainInfo from "./blockchain-info";
import ConnectionClient from './connection-client';
import { Account } from "./account";
import User from "./user";

export default class Blockchain {
    readonly info: BlockchainInfo;
    private readonly connection: ConnectionClient;

    constructor(info: BlockchainInfo, connection: ConnectionClient) {
        this.info = info;
        this.connection = connection;
    }

    static async connect(url, blockchainRID): Promise<Blockchain> {
        const connection = new ConnectionClient(url, blockchainRID);
        const info = await BlockchainInfo.getInfo(connection);
        return new Blockchain(info, connection);
    }

    async getAccountById(id: Buffer, user: User): Promise<Account> {
        return await Account.getById(id, user, this.connection);
    }
}

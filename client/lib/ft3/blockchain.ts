import BlockchainInfo from "./blockchain-info";
import ConnectionClient from './connection-client';
import {Account, AuthDescriptor} from "./account";
import User from "./user";
import Asset from "./asset";

export default class Blockchain {
    readonly info: BlockchainInfo;
    private readonly connection: ConnectionClient;

    constructor(info: BlockchainInfo, connection: ConnectionClient) {
        this.info = info;
        this.connection = connection;
    }

    static async connect(url, blockchainRID): Promise<Blockchain> {
        const connection = new ConnectionClient(url, blockchainRID);
        return await this.connectWithClient(connection);
    }

    static async connectWithClient(connection: ConnectionClient) {
        const info = await BlockchainInfo.getInfo(connection);
        return new Blockchain(info, connection);
    }

    async getAccountById(id: Buffer, user: User): Promise<Account> {
        return await Account.getById(id, user, this.connection);
    }

    async getAccountsByParticipantId(id: Buffer, user: User): Promise<Account[]> {
        return await Account.getByParticipantId(id, user, this.connection);
    }

    async getAccountsByAuthDescriptorId(id: Buffer, user: User): Promise<Account[]> {
        return await Account.getByAuthDescriptorId(id , user, this.connection);
    }

    async registerAccount(authDesciptor: AuthDescriptor, user): Promise<Account> {
        return await Account.register(authDesciptor, [user.keyPair], user, this.connection);
    }

    async getAssetsByName(name): Promise<Asset[]> {
        return await Asset.getByName(name, this.connection);
    }

    async linkChain(chainId: Buffer) {
        const tx = this.connection.gtx.newTransaction([]);
        tx.addOperation('ft3.link_chain', chainId.toString('hex'));
        await tx.postAndWaitConfirmation();
    }

    async isLinkedWithChain(chainId: Buffer): Promise<boolean> {
        return await this.connection.gtx.query(
            'ft3.is_linked_with_chain',
            { 'chain_rid': chainId.toString('hex') }
        ) === 1
    }

    async getLinkedChains(): Promise<Buffer[]> {
        const linkedChains = await this.connection.gtx.query('ft3.get_linked_chains', {});
        return linkedChains.map(chainId => Buffer.from(chainId, 'hex'));
    }
}

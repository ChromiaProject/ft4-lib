import BlockchainInfo from "./blockchain-info";
import ConnectionClient from './connection-client';
import {Account, AuthDescriptor} from "./account";
import Asset from "./asset";
import DirectoryService from "./directory-service";
import TransactionBuilder from "./transaction-builder";
import BlockchainSession from "./blockchain-session";
import User from "./user";

export default class Blockchain {
    readonly id: Buffer;
    readonly info: BlockchainInfo;
    readonly connection: ConnectionClient;
    private readonly directoryService: DirectoryService;

    constructor(
        id: Buffer,
        info: BlockchainInfo,
        connection: ConnectionClient,
        directoryService: DirectoryService
    ) {
        this.id = id;
        this.info = info;
        this.connection = connection;
        this.directoryService = directoryService;
    }

    static async initialize(blockchainRID: Buffer, directoryService: DirectoryService): Promise<Blockchain> {
        const chainConnectionInfo = await directoryService.getChainConnectionInfo(blockchainRID);
        if (!chainConnectionInfo) {
            throw new Error(`Cannot find details for chain with RID: ${
                blockchainRID.toString('hex')
            }`)
        }

        const connection = new ConnectionClient(
            chainConnectionInfo.url,
            blockchainRID.toString('hex')
        );
        const info = await BlockchainInfo.getInfo(connection);
        return new Blockchain(blockchainRID, info, connection, directoryService);
    }

    newSession(user: User): BlockchainSession {
        return new BlockchainSession(user, this);
    }

    async getAccountsByParticipantId(id: Buffer, user: User): Promise<Account[]> {
        return await Account.getByParticipantId(id, this.newSession(user));
    }

    async getAccountsByAuthDescriptorId(id: Buffer, user: User): Promise<Account[]> {
        return await Account.getByAuthDescriptorId(id , this.newSession(user));
    }

    async registerAccount(authDesciptor: AuthDescriptor, user): Promise<Account> {
        return await Account.register(authDesciptor, this.newSession(user));
    }

    async getAssetsByName(name): Promise<Asset[]> {
        return await Asset.getByName(name, this);
    }

    async linkChain(chainId: Buffer) {
        const tx = this.connection.gtx.newTransaction([]);
        tx.addOperation('ft3.link_chain', chainId.toString('hex'));
        await tx.postAndWaitConfirmation();
    }

    async isLinkedWithChain(chainId: Buffer): Promise<boolean> {
        return await this.query(
            'ft3.is_linked_with_chain',
            { 'chain_rid': chainId.toString('hex') }
        ) === 1
    }

    async getLinkedChainsIds(): Promise<Buffer[]> {
        const linkedChains = await this.query('ft3.get_linked_chains', {});
        return linkedChains.map(chainId => Buffer.from(chainId, 'hex'));
    }

    async getLinkedChains(): Promise<Blockchain[]> {
        const chainIds = await this.getLinkedChainsIds();
        return Promise.all(chainIds.map(chainId => {
            return Blockchain.initialize(chainId, this.directoryService);
        }));
    }

    async query(name: string, params: any): Promise<any> {
        return await this.connection.query(name, params);
    }

    transactionBuilder(): TransactionBuilder {
        return new TransactionBuilder(this);
    }
}

import {gtv} from 'postchain-client';
import KeyPair from "../cyptoUtils/keyPair";
import AssetBalance from './asset-balance';
import User from "./user";
import AuthDescriptorFactory from "./auth-descriptor/auth-descriptor-factory";
import PaymentHistory from "./payment-history/payment-history";
import PaymentHistoryIterator from "./payment-history/payment-history-iterator";
import PaymentHistorySyncManager from "./payment-history/payment-history-sync-manager";
import Blockchain from "./blockchain";

enum AuthType {
    single_sig = "S",
    multi_sig = "M",
}

type PubKey = Buffer;

enum FlagsType {
    Account = "A", // Change Account settings
    Transfer = "T" // Transfer balance
}

interface GtvSerializable {
    hash(): Buffer;
    toGTV(): any[];
}

class Flags {
    private flagsOrder = [FlagsType.Account, FlagsType.Transfer];

    flags: Set<FlagsType>;

    constructor(flags: Set<FlagsType>) {
        this.flags = flags;
    }

    hasFlag(flag: FlagsType) {
        return this.flags.has(flag);
    }

    toGTV() {
        return this.flagsOrder.map(flag => this.flags.has(flag) ? flag : null).filter(flag => flag);
    }
}

interface AuthDescriptor extends GtvSerializable {
    signers: PubKey[]
}


class Account {
    private paymentHistorySyncManager = new PaymentHistorySyncManager();

    readonly id_: Buffer;
    authDescriptor: AuthDescriptor[];
    assets: AssetBalance[] = [];
    readonly user: User;
    readonly blockchain: Blockchain;

    constructor(id: Buffer, authDescriptor: AuthDescriptor[], user: User, blockchain: Blockchain) {
        this.id_ = id;
        this.authDescriptor = authDescriptor;
        this.user = user;
        this.blockchain = blockchain;
    }

    static async getByParticipantId(id: Buffer, user: User, blockchain: Blockchain): Promise<Account []> {
        const accountIds = await blockchain.query(
            'ft3.get_accounts_by_participant_id',
            { id: id.toString('hex') }
        );
        return await this.getByIds(accountIds.map(id => Buffer.from(id, 'hex')), user, blockchain);
    }

    static async getByAuthDescriptorId(id: Buffer, user: User, blockchain: Blockchain): Promise<Account[]> {
        const accountIds = await blockchain.query(
            'ft3.get_accounts_by_auth_descriptor_id',
            { descriptor_id: id.toString('hex') }
        );
        return await this.getByIds(accountIds.map(id => Buffer.from(id, 'hex')), user, blockchain);
    }

    static registerOp(authDescriptor: AuthDescriptor): any[] {
        return ['ft3.dev_register_account', authDescriptor.toGTV()];
    }

    static async register(authDescriptor: AuthDescriptor, signers: KeyPair[], user: User, blockchain: Blockchain) {
        await blockchain
            .transactionBuilder()
            .addOperation(...this.registerOp(authDescriptor))
            .build(user.authDescriptor.signers)
            .sign(user.keyPair)
            .post();

        const account = new Account(authDescriptor.hash(), [authDescriptor], user, blockchain);
        await account.syncAssets();
        return account
    }

    static async getByIds(ids: Buffer[], user: User, blockchain: Blockchain): Promise<Account []> {
        return Promise.all(ids.map(id => this.getById(id, user, blockchain)));
    }

    static async getById(id: Buffer, user: User, blockchain: Blockchain): Promise<Account> {
        const account = await blockchain.query(
            'ft3.get_account_by_id',
            { id: id.toString('hex')}
        );

        if (!account) { return null }

        const authDescriptors = await blockchain.query(
            'ft3.get_account_auth_descriptors',
            { id: id.toString('hex')}
        );

        const authDescriptorFactory = new AuthDescriptorFactory();
        const descriptors = authDescriptors.map(authDescriptor =>
            authDescriptorFactory.create(
                authDescriptor.type,
                Buffer.from(authDescriptor.args, 'hex')
            )
        );

        const acc = new Account(id, descriptors, user, blockchain);

        await acc.syncAssets();

        return acc;
    }

    addAuthDescriptorOp(authDescriptor: AuthDescriptor): any[] {
        return [
            'ft3.add_auth_descriptor',
            this.id_.toString('hex'),
            this.user.authDescriptor.hash().toString('hex'),
            authDescriptor.toGTV()
        ]
    }

    async addAuthDescriptor(authDescriptor: AuthDescriptor, signers: KeyPair[]) {
        await this.blockchain.transactionBuilder()
            .addOperation(...this.addAuthDescriptorOp(authDescriptor))
            .build(signers.map(({ pubKey }) => pubKey))
            .sign(signers[0])
            .post();
        this.authDescriptor.push(authDescriptor);
    }

    async sync(): Promise<void> {
        await Promise.all([this.syncAssets()]);
    }

    private async syncAssets(): Promise<void> {
        this.assets = await AssetBalance.getByAccountId(this.id_, this.blockchain);
    }

    getAssetById(id: Buffer) {
        //TODO: find better way to compare buffers
        return this.assets.find(assetBalance => (
            assetBalance.asset.id.toString('hex') === id.toString('hex'))
        );
    }

    async transferInputsToOutputs(inputs, outputs) {
        await this.blockchain.transactionBuilder()
            .addOperation('ft3.transfer', inputs, outputs)
            .build(this.user.authDescriptor.signers)
            .sign(this.user.keyPair)
            .post();

        await this.syncAssets();
    }

    async transfer(accountId: Buffer, assetId: Buffer, amount: number) {
        const input = [
            this.id_.toString('hex'),
            assetId.toString('hex'),
            this.authDescriptor[0].hash(), //TODO: Replace hash with id
            amount,
            []
        ];

        const output = [
            accountId.toString('hex'),
            assetId.toString('hex'),
            amount,
            []
        ];

        await this.transferInputsToOutputs([input], [output]);
    }

    async burnTokens(assetId, amount) {
        const input = [
            this.id_.toString('hex'),
            assetId.toString('hex'),
            this.authDescriptor[0].hash(), //TODO: Replace hash with id
            amount,
            []
        ];

        await this.transferInputsToOutputs([input], []);
    }

    async getPaymentHistory(): Promise<any[]> {
        return await PaymentHistory.getByAccountId(this.id_, -1, this.blockchain.connection);
    }

    async getPaymentHistoryIterator(pageSize): Promise<PaymentHistoryIterator> {
        if (pageSize < 1) throw new Error('Page size has to be greater than 1');
        await this.paymentHistorySyncManager.syncAccount(this.id_, this.blockchain);
        return this.paymentHistorySyncManager.paymentHistoryStore.getIterator(this.id_, pageSize);
    }

    async xcTransfer(destinationChainId: Buffer, destinationAccountId: Buffer, assetId: Buffer, amount: number) {
        const source = [
            this.id_.toString('hex'),
            assetId.toString('hex'),
            this.authDescriptor[0].hash().toString('hex'),
            amount,
            []
        ];

        const target = [
            destinationAccountId.toString('hex'),
            []
        ];

        const hops = [
            destinationChainId.toString('hex')
        ];

        const tx = this.blockchain.connection.gtx.newTransaction([this.user.keyPair.pubKey]);
        tx.addOperation('ft3.xc.init_xfer', source, target, hops);
        tx.sign(this.user.keyPair.privKey, this.user.keyPair.pubKey);
        await tx.postAndWaitConfirmation();

        await this.syncAssets();
    }
}



export {
    PubKey,
    Account,
    AuthDescriptor,
    AuthType,
    Flags,
    FlagsType
}
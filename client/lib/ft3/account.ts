import { gtv } from 'postchain-client';
import AssetBalance from './asset-balance';
import AuthDescriptorFactory from "./auth-descriptor/auth-descriptor-factory";
import PaymentHistory from "./payment-history/payment-history";
import PaymentHistoryIterator from "./payment-history/payment-history-iterator";
import PaymentHistorySyncManager from "./payment-history/payment-history-sync-manager";
import BlockchainSession from "./blockchain-session";
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
    readonly session: BlockchainSession;

    constructor(id: Buffer, authDescriptor: AuthDescriptor[], session: BlockchainSession) {
        this.id_ = id;
        this.authDescriptor = authDescriptor;
        this.session = session;
    }

    get blockchain(): Blockchain {
        return this.session.blockchain;
    }

    static async getByParticipantId(id: Buffer, session: BlockchainSession): Promise<Account []> {
        const accountIds = await session.query(
            'ft3.get_accounts_by_participant_id',
            { id: id.toString('hex') }
        );
        return await this.getByIds(accountIds.map(id => Buffer.from(id, 'hex')), session);
    }

    static async getByAuthDescriptorId(id: Buffer, session: BlockchainSession): Promise<Account[]> {
        const accountIds = await session.query(
            'ft3.get_accounts_by_auth_descriptor_id',
            { descriptor_id: id.toString('hex') }
        );
        return await this.getByIds(accountIds.map(id => Buffer.from(id, 'hex')), session);
    }

    static async register(authDescriptor: AuthDescriptor, session: BlockchainSession) {
        await session.execute(...this.registerOp(authDescriptor));
        const account = new Account(authDescriptor.hash(), [authDescriptor], session);
        await account.syncAssets();
        return account
    }

    static async getByIds(ids: Buffer[], session: BlockchainSession): Promise<Account []> {
        return Promise.all(ids.map(id => this.getById(id, session)));
    }

    static async getById(id: Buffer, session: BlockchainSession): Promise<Account> {
        const account = await session.query(
            'ft3.get_account_by_id',
            { id: id.toString('hex')}
        );

        if (!account) { return null }

        const authDescriptors = await session.query(
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

        const acc = new Account(id, descriptors, session);
        await acc.syncAssets();
        return acc;
    }

    async addAuthDescriptor(authDescriptor: AuthDescriptor) {
        await this.session.execute(...this.addAuthDescriptorOp(authDescriptor));
        this.authDescriptor.push(authDescriptor);
    }

    async deleteAllAuthDescriptorsExclude(authDescriptor: AuthDescriptor): Promise<void> {
        await this.session.execute(
            'ft3.delete_all_auth_descriptors_exclude',
            this.id_.toString('hex'),
            authDescriptor.hash().toString('hex')
        );
        this.authDescriptor = [authDescriptor];
    }

    async sync(): Promise<void> {
        await Promise.all([this.syncAssets()]);
    }

    private async syncAssets(): Promise<void> {
        this.assets = await AssetBalance.getByAccountId(this.id_, this.session.blockchain);
    }

    getAssetById(id: Buffer) {
        //TODO: find better way to compare buffers
        return this.assets.find(assetBalance => (
            assetBalance.asset.id.toString('hex') === id.toString('hex'))
        );
    }

    async transferInputsToOutputs(inputs, outputs) {
        await this.session.execute('ft3.transfer', inputs, outputs);
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
        return await PaymentHistory.getByAccountId(this.id_, -1, this.session.blockchain.connection);
    }

    async getPaymentHistoryIterator(pageSize): Promise<PaymentHistoryIterator> {
        if (pageSize < 1) throw new Error('Page size has to be greater than 1');
        await this.paymentHistorySyncManager.syncAccount(this.id_, this.session.blockchain);
        return this.paymentHistorySyncManager.paymentHistoryStore.getIterator(this.id_, pageSize);
    }

    async xcTransfer(destinationChainId: Buffer, destinationAccountId: Buffer, assetId: Buffer, amount: number) {
        await this.session.execute(...this.xcTransferOp(destinationChainId, destinationAccountId, assetId, amount));
        await this.syncAssets();
    }

    /* Operation and query */

    xcTransferOp(destinationChainId: Buffer, destinationAccountId: Buffer, assetId: Buffer, amount: number): any[] {
        const source = [
            this.id_.toString('hex'),
            assetId.toString('hex'),
            this.session.user.authDescriptor.hash().toString('hex'),
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
        return ['ft3.xc.init_xfer', source, target, hops];
    }

    addAuthDescriptorOp(authDescriptor: AuthDescriptor): any[] {
        return [
            'ft3.add_auth_descriptor',
            this.id_.toString('hex'),
            this.session.user.authDescriptor.hash().toString('hex'),
            authDescriptor.toGTV()
        ]
    }

    static registerOp(authDescriptor: AuthDescriptor): any[] {
        return ['ft3.dev_register_account', authDescriptor.toGTV()];
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
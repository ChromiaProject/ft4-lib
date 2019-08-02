import {gtv} from 'postchain-client';
import KeyPair from "../cyptoUtils/keyPair";
import AssetBalance from './asset-balance';
import User from "./user";
import ConnectionClient from "./connection-client";
import AuthDescriptorFactory from "./auth-descriptor/auth-descriptor-factory";
import PaymentHistory from "./payment-history/payment-history";
import PaymentHistoryIterator from "./payment-history/payment-history-iterator";
import PaymentHistorySyncManager from "./payment-history/payment-history-sync-manager";

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

    id_: Buffer;
    authDescriptor: AuthDescriptor[];
    assets: AssetBalance[] = [];
    user: User;
    connection: ConnectionClient;

    constructor(id: Buffer, authDescriptor: AuthDescriptor[], user: User, connection: ConnectionClient) {
        this.id_ = id;
        this.authDescriptor = authDescriptor;
        this.user = user;
        this.connection = connection;
    }

    static async getByParticipantId(id: Buffer, connection: ConnectionClient) {
        return await connection.gtx.query('ft3.get_accounts_by_participant_id', { id: id.toString('hex') });
    }

    static registerOp(authDescriptor: AuthDescriptor): any[] {
        return ['ft3.dev_register_account', authDescriptor.toGTV()];
    }

    static async register(authDescriptor: AuthDescriptor, signers: KeyPair[], user: User, connection: ConnectionClient) {
        const tx = connection.gtx.newTransaction(signers.map(({ pubKey }) => pubKey));
        tx.addOperation(...this.registerOp(authDescriptor));
        signers.forEach(({ privKey, pubKey}) => tx.sign(privKey, pubKey));
        await tx.postAndWaitConfirmation();
        return new Account(authDescriptor.hash(), [authDescriptor], user, connection);
    }

    static async registerWithUser(user: User, connectionClient: ConnectionClient): Promise<Account> {
        return await this.register(user.authDescriptor, [user.keyPair], user, connectionClient)
    }

    static async getById(id: Buffer, user: User, connection: ConnectionClient): Promise<Account> {
        const account = await connection.gtx.query(
            'ft3.get_account_by_id',
            { id: id.toString('hex')}
        );

        if (!account) { return null }

        const authDescriptors = await connection.gtx.query(
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

        const acc = new Account(id, descriptors, user, connection);

        await acc.syncAssets();

        return acc;
    }

    addAuthDescriptorOp(authDescriptor: AuthDescriptor): any[] {
        return ['ft3.add_auth_descriptor', this.authDescriptor[0].hash(), this.id_.toString('hex'), authDescriptor.toGTV(), ]
    }

    async addAuthDescriptor(authDescriptor: AuthDescriptor, signers: KeyPair[]) {
        const tx = this.connection.gtx.newTransaction(signers.map(({ pubKey }) => pubKey));
        tx.addOperation(...this.addAuthDescriptorOp(authDescriptor));
        signers.forEach(({ privKey, pubKey}) => tx.sign(privKey, pubKey));
        await tx.postAndWaitConfirmation();
        this.authDescriptor.push(authDescriptor);
    }

    private async syncAssets(): Promise<void> {
        this.assets = await AssetBalance.getByAccountId(this.id_, this.connection);
    }

    getAssetById(id: Buffer) {
        //TODO: find better way to compare buffers
        return this.assets.find(assetBalance => (
            assetBalance.asset.id.toString('hex') === id.toString('hex'))
        );
    }

    async transferInputsToOutputs(inputs, outputs) {
        const tx = this.connection.gtx.newTransaction([this.user.keyPair.pubKey]);
        tx.addOperation('ft3.transfer', inputs, outputs);
        tx.sign(this.user.keyPair.privKey, this.user.keyPair.pubKey);
        await tx.postAndWaitConfirmation();

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
        return await PaymentHistory.getByAccountId(this.id_, -1, this.connection);
    }

    async getPaymentHistoryIterator(pageSize): Promise<PaymentHistoryIterator> {
        if (pageSize < 1) throw new Error('Page size has to be greater than 1');
        await this.paymentHistorySyncManager.syncAccount(this.id_, this.connection);
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

        const tx = this.connection.gtx.newTransaction([this.user.keyPair.pubKey]);
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
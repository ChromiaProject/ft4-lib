import { gtv, util } from 'postchain-client';
import AssetBalance from './asset-balance';
import AuthDescriptorFactory from "./auth-descriptor/auth-descriptor-factory";
import PaymentHistory from "./payment-history/payment-history";
import PaymentHistoryIterator from "./payment-history/payment-history-iterator";
import PaymentHistorySyncManager from "./payment-history/payment-history-sync-manager";
import BlockchainSession from "./blockchain-session";
import Blockchain from "./blockchain";
import {
    transfer,
    addAuthDescriptor,
    register,
    nop,
    deleteAllAuthDescriptorsExclude,
    xcTransfer
} from "./account-operations";
import {
    accountAuthDescriptors,
    accountById,
    accountsByAuthDescriptorId,
    accountsByParticipantId
} from "./account-queries";
import Operation from "./operation";

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
        return this.flagsOrder
            .map(flag => this.flags.has(flag) ? flag : null)
            .filter(flag => flag);
    }
}

interface AuthDescriptor extends GtvSerializable {
    id: Buffer;
    signers: PubKey[];
    hash(): Buffer;
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

    static async getByParticipantId(id: Buffer, session: BlockchainSession): Promise<Account[]> {
        const accountIds = await session.query(...accountsByParticipantId(id));
        return await this.getByIds(accountIds.map(id => Buffer.from(id, 'hex')), session);
    }

    static async getByAuthDescriptorId(id: Buffer, session: BlockchainSession): Promise<Account[]> {
        const accountIds = await session.query(...accountsByAuthDescriptorId(id));
        return await this.getByIds(accountIds.map(id => Buffer.from(id, 'hex')), session);
    }

    static async register(authDescriptor: AuthDescriptor, session: BlockchainSession): Promise<Account> {
        await session.call(register(authDescriptor));
        const account = new Account(authDescriptor.hash(), [authDescriptor], session);
        await account.syncAssets();
        return account
    }

    static rawRegisterTransaction(authDescriptor: AuthDescriptor, ssoAuthDescriptor: AuthDescriptor, session: BlockchainSession): Buffer {
        return session.blockchain.transactionBuilder()
            .add(register(authDescriptor))
            .add(addAuthDescriptor(authDescriptor.id, authDescriptor.id, ssoAuthDescriptor))
            .build([authDescriptor.signers /*, ssoAuthDescriptor.signers */].flat())
            .sign(session.user.keyPair)
            .raw()
    }

    static async getByIds(ids: Buffer[], session: BlockchainSession): Promise<Account[]> {
        return Promise.all(ids.map(id => this.getById(id, session)));
    }

    static async getById(id: Buffer, session: BlockchainSession): Promise<Account> {
        const account = await session.query(...accountById(id));

        if (!account) { return null }

        const authDescriptors = await  session.query(...accountAuthDescriptors(id));

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

    async addAuthDescriptor(authDescriptor: AuthDescriptor): Promise<void> {
        await this.session.call(addAuthDescriptor(this.id_, this.session.user.authDescriptor.id, authDescriptor));
        this.authDescriptor.push(authDescriptor);
    }

    async deleteAllAuthDescriptorsExclude(authDescriptor: AuthDescriptor): Promise<void> {
        await this.session.call(deleteAllAuthDescriptorsExclude(this.id_, authDescriptor.id));
        this.authDescriptor = [authDescriptor];
    }

    async sync(): Promise<void> {
        await Promise.all([this.syncAssets()]);
    }

    private async syncAssets(): Promise<void> {
        this.assets = await AssetBalance.getByAccountId(this.id_, this.session.blockchain);
    }

    getAssetById(id: Buffer): AssetBalance {
        //TODO: find better way to compare buffers
        return this.assets.find(assetBalance => (
            assetBalance.asset.id.toString('hex') === id.toString('hex'))
        );
    }

    async transferInputsToOutputs(inputs: Array<GtvSerializable>, outputs: Array<GtvSerializable>): Promise<void> {
        await this.blockchain.transactionBuilder()
            .add(transfer(inputs, outputs))
            .add(nop())
            .build(this.session.user.authDescriptor.signers)
            .sign(this.session.user.keyPair)
            .post();
        await this.syncAssets();
    }

    async transfer(accountId: Buffer, assetId: Buffer, amount: number): Promise<void> {
        const input = [
            this.id_,
            assetId,
            this.session.user.authDescriptor.id,
            amount,
            []
        ];

        const output = [
            accountId,
            assetId,
            amount,
            []
        ];

        await this.transferInputsToOutputs([input], [output]);
    }

    async burnTokens(assetId, amount): Promise<void> {
        const input = [
            this.id_,
            assetId,
            this.session.user.authDescriptor.id,
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

    async xcTransfer(destinationChainId: Buffer, destinationAccountId: Buffer, assetId: Buffer, amount: number): Promise<void> {
        await this.blockchain.transactionBuilder()
            .add(this.xcTransferOp(destinationChainId, destinationAccountId, assetId, amount))
            .add(nop())
            .build(this.session.user.authDescriptor.signers)
            .sign(this.session.user.keyPair)
            .post();
        await this.syncAssets();
    }

    /* Operation and query */

    xcTransferOp(destinationChainId: Buffer, destinationAccountId: Buffer, assetId: Buffer, amount: number): Operation {
        const source = [
            this.id_,
            assetId,
            this.session.user.authDescriptor.id,
            amount,
            []
        ];
        const target = [
            destinationAccountId,
            []
        ];
        const hops = [
            destinationChainId
        ];

        return xcTransfer(source, target, hops);
    }
}

export {
    PubKey,
    Account,
    AuthDescriptor,
    AuthType,
    Flags,
    FlagsType,
    GtvSerializable
}
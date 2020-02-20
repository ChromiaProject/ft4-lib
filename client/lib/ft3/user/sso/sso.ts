import {Account, FlagsType} from '../account';
import { gtx, util } from 'postchain-client';
import Blockchain from '../../core/blockchain/blockchain';
import Transaction from '../../core/transaction';
import User from '../user';
import SSOStore from './sso-store';
import SingleSignatureAuthDescriptor from '../auth-descriptor/single-signature-auth-descriptor';
import Operation from '../../core/operation';
import SSOStoreDefault from './sso-store-default';

let vaultUrl = 'https://vault-testnet.chromia.com';

const Operations = {
    register: 'ft3.dev_register_account',
    addAuthDescriptor: 'ft3.add_auth_descriptor',
};

function assert(condition: boolean, error: string) {
    if (!condition) {
        throw new Error(error);
    }
}

function getAccountId(transaction: Transaction): Buffer {
    const operations = transaction.operations;
    if (operations.length === 1) {
        return Buffer.from(<string>operations[0].args[0], 'hex');
    } else if (operations.length === 2) {
        return Buffer.from(<string>operations[1].args[0], 'hex');
    } else {
        throw new Error('Invalid sso transaction');
    }
}

function validateRegisterAccountOperation(operation: Operation) {
    assert(
        operation.name === Operations.register,
        `Expected '${Operations.register}', found '${operation.name}'`
    );
}

function validateAddAuthDescriptorOperation(operation: Operation, pubKey: Buffer) {
    assert(
        operation.name === Operations.addAuthDescriptor,
        `Expected '${Operations.addAuthDescriptor}', found '${operation.name}'`
    );
}

function validateTransaction(transaction: Transaction, pubKey: Buffer) {
    const operations = transaction.operations;
    if (operations.length === 1) {
        validateAddAuthDescriptorOperation(operations[0], pubKey);
    } else if (operations.length === 2) {
        validateRegisterAccountOperation(operations[0]);
        validateAddAuthDescriptorOperation(operations[1], pubKey);
    } else {
        throw new Error(`Invalid operation count. Found ${operations.length} operations in sso transaction`);
    }
}

export default class SSO {
    constructor(readonly blockchain: Blockchain, readonly store: SSOStore = new SSOStoreDefault()) {}

    static get vaultUrl(): string {
        return vaultUrl;
    }

    static set vaultUrl(value: string) {
        vaultUrl = value;
    }

    private async getAccountAndUserByStoredIds(): Promise<[Account, User]> {
        const keyPair = this.store.keyPair;
        const accountId = this.store.accountId;

        if (!keyPair || !accountId) { return [null, null] }

        const authDescriptor = new SingleSignatureAuthDescriptor(
            keyPair.pubKey,
            [FlagsType.Transfer]
        );

        const user = new User(
            keyPair,
            authDescriptor
        );

        const account = await this.blockchain.newSession(user).getAccountById(accountId);

        if (!account || !user) { return [null, null] }

        return [account, user];
    }

    async autoLogin(): Promise<[Account, User]> {
        const [account, user] = await this.getAccountAndUserByStoredIds();

        if (!account || !user) { return [null, null] }

        const isAuthDescriptorValid = await account.isAuthDescriptorValid(user.authDescriptor.id);

        if (!isAuthDescriptorValid) { return [null, null] }

        return [account, user];
    }

    initiateLogin(successUrl: string, cancelUrl: string) {
        this.store.clear();

        const keyPair = util.makeKeyPair();
        this.store.tmpPrivKey = keyPair.privKey;

        window.location.href = `${vaultUrl}/?route=/authorize&dappId=${
            this.blockchain.id.toString('hex')
        }&pubkey=${
            keyPair.pubKey.toString('hex')
        }&successAction=${
            encodeURIComponent(successUrl)
        }&cancelAction=${
            encodeURIComponent(cancelUrl)
        }&version=0.1`;
    }

    async finalizeLogin(tx: string): Promise<[Account, User]> {
        const keyPair = this.store.tmpKeyPair;
        this.store.clearTmp();

        if (!keyPair) {
            throw new Error('Error loading public key');
        }

        this.store.privKey = keyPair.privKey;

        const authDescriptor = new SingleSignatureAuthDescriptor(
            keyPair.pubKey,
            [FlagsType.Transfer]
        );

        const user = new User(
            keyPair,
            authDescriptor
        );

        const transaction = Transaction
            .fromRawTransaction(Buffer.from(tx, 'hex'), this.blockchain)
            .sign(keyPair);

        validateTransaction(transaction, keyPair.pubKey);

        await transaction.post();

        let accountId = getAccountId(transaction);

        this.store.accountId = accountId;

        const account = await this.blockchain.newSession(user).getAccountById(accountId);

        return [account, user];
    }

    async logout(): Promise<void> {
        const [account, user] = await this.getAccountAndUserByStoredIds();

        if (account && user) {
            await account.deleteAuthDescriptor(user.authDescriptor);
        }

        this.store.clear()
    }
}
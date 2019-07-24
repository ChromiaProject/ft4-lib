import { gtv } from 'postchain-client';
import KeyPair from "../cyptoUtils/keyPair";
import AssetBalance from './asset-balance';

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

class Auth {
    flags: Flags;

    constructor(flags: Flags) {
        this.flags = flags;
    }

    toGTV() {
        return [this.flags.toGTV()];
    }

}

interface AuthDescriptor extends GtvSerializable {

}

class SingleSignatureAuthDescriptor implements AuthDescriptor {
    pubkey: PubKey;
    flags: Flags;

    constructor(pubkey: PubKey, flags: FlagsType[]) {
        this.flags = new Flags(new Set(flags));
        this.pubkey = pubkey;
    }

    toGTV(): any[] {
        return [
            AuthType.single_sig,
            [this.pubkey.toString('hex')],
            [this.flags.toGTV(), this.pubkey.toString('hex')]
        ];
    }

    hash(): Buffer {
        return gtv.gtvHash([AuthType.single_sig, [this.pubkey], [this.flags.toGTV(), this.pubkey.toString('hex')]]);
    }
}

class MultiSignatureAuthDescriptor implements AuthDescriptor {
    pubkeys: PubKey[];
    flags: Flags;
    signaturesRequired: number;

    constructor(pubkeys: PubKey[], signaturesRequired: number, flags: FlagsType[]) {
        if (signaturesRequired > pubkeys.length) {
            throw new Error('Number of required signatures have to be less or equal to number of pubkeys');
        }

        this.pubkeys = pubkeys;
        this.signaturesRequired = signaturesRequired;
        this.flags = new Flags(new Set(flags));
    }

    toGTV(): any[] {
        return [
            AuthType.multi_sig,
            this.pubkeys.map(pubkey => pubkey.toString('hex')),
            [
                this.flags.toGTV(),
                this.signaturesRequired,
                this.pubkeys.map(pubkey => pubkey.toString('hex'))
            ]
        ]
    }

    hash(): Buffer {
        return gtv.gtvHash([
            AuthType.multi_sig,
            this.pubkeys,
            [
                this.flags.toGTV(),
                this.signaturesRequired,
                this.pubkeys.map(pubkey => pubkey.toString('hex'))
            ]
        ]);
    }
}


class Account {
    id_: Buffer;
    authDescriptor: AuthDescriptor[];
    assets: AssetBalance[] = [];

    constructor(id: Buffer, authDescriptor?: AuthDescriptor[]) {
        this.id_ = id;
        if (authDescriptor) {
            this.authDescriptor = authDescriptor;
        }
    }

    static getByParticipantId(id: Buffer, gtx) {
        return gtx.query('ft3.get_accounts_by_participant_id', { id: id.toString('hex') });
    }

    // register(tx: any) {
    //     if (process.env.DEV) {
    //         if (this.authDescriptor.length != 1) throw Error("You can register new account only with 1 descriptor")
    //         console.log(this.authDescriptor[0].toGTV());
    //         tx.addOperation('ft3.dev_register_account', this.authDescriptor[0].toGTV());
    //         return tx;
    //     } else {
    //         throw Error("You have to enable DEV mode")
    //     }
    // }

    static registerOp(authDescriptor: AuthDescriptor): any[] {
        return ['ft3.dev_register_account', authDescriptor.toGTV()];
    }

    static async register(authDescriptor: AuthDescriptor, signers: KeyPair[], gtx) {
        const tx = gtx.newTransaction(signers.map(({ pubKey }) => pubKey));
        tx.addOperation(...this.registerOp(authDescriptor));
        signers.forEach(({ privKey, pubKey}) => tx.sign(privKey, pubKey));
        await tx.postAndWaitConfirmation();
        return new Account(authDescriptor.hash(), [authDescriptor]);
    }

    addAuthDescriptorOp(authDescriptor: AuthDescriptor): any[] {
        return ['ft3.add_auth_descriptor', this.authDescriptor[0].hash(), this.id_.toString('hex'), authDescriptor.toGTV(), ]
    }

    async addAuthDescriptor(authDescriptor: AuthDescriptor, signers: KeyPair[], gtx) {
        const tx = gtx.newTransaction(signers.map(({ pubKey }) => pubKey));
        tx.addOperation(...this.addAuthDescriptorOp(authDescriptor));
        signers.forEach(({ privKey, pubKey}) => tx.sign(privKey, pubKey));
        await tx.postAndWaitConfirmation();
        this.authDescriptor.push(authDescriptor);
    }

    transferOp(accountId, assetId, amount) {

    }

    private async syncAssets(): Promise<void> {
        this.assets = await AssetBalance.getByAccountId(this.id_);
    }

    getAssetById(id: Buffer) {
        //TODO: find better way to compare buffers
        return this.assets.find(assetBalance => (
            assetBalance.asset.id.toString('hex') === id.toString('hex'))
        );
    }

    async transferInputsToOutputs(inputs, outputs, signers, gtx) {
        const tx = gtx.newTransaction(signers.map(({ pubKey }) => pubKey));
        tx.addOperation('ft3.transfer', inputs, outputs);
        signers.forEach(({ privKey, pubKey}) => tx.sign(privKey, pubKey));
        await tx.postAndWaitConfirmation();

        await this.syncAssets();
    }

    async transfer(accountId: Buffer, assetId: Buffer, amount: number, signers: KeyPair[], gtx) {
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

        await this.transferInputsToOutputs([input], [output], signers, gtx);
    }

    async burnTokens(assetId, amount, signers: KeyPair[], gtx) {
        const input = [
            this.id_.toString('hex'),
            assetId.toString('hex'),
            this.authDescriptor[0].hash(), //TODO: Replace hash with id
            amount,
            []
        ];

        await this.transferInputsToOutputs([input], [], signers, gtx);
    }

    async getPaymentHistory(gtx): Promise<any[]> {
        return await gtx.query(
            'ft3.get_payment_history',
            { account_id: this.id_.toString('hex') }
        );
    }

    async xcTransfer(destinationChainId: Buffer, destinationAccountId: Buffer, assetId: Buffer, amount: number, signers: KeyPair[], gtx) {
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

        const tx = gtx.newTransaction(signers.map(({ pubKey }) => pubKey));
        tx.addOperation('ft3.xc.init_xfer', source, target, hops);
        signers.forEach(({ privKey, pubKey}) => tx.sign(privKey, pubKey));
        await tx.postAndWaitConfirmation();

        await this.syncAssets();
    }
}



export {
    Account,
    AuthDescriptor,
    AuthType,
    SingleSignatureAuthDescriptor,
    MultiSignatureAuthDescriptor,
    Flags,
    FlagsType
}


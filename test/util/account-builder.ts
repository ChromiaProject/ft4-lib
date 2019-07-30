import { Account, FlagsType } from "../../client";
import KeyPair from "../../client/lib/cyptoUtils/keyPair";
import Asset from "../../client/lib/ft3/asset";
import ConnectionClient from "../../client/lib/ft3/connection-client";
import User from "../../client/lib/ft3/user";
import TestUser from "./test-user";
import SingleSignatureAuthDescriptor from "../../client/lib/ft3/auth-descriptor/signle-signature-auth-descriptor";
import MultiSignatureAuthDescriptor from "../../client/lib/ft3/auth-descriptor/multi-signature-auth-descriptor";
import AssetBalance from "../../client/lib/ft3/asset-balance";


class AccountBuilder {
    private connection: ConnectionClient;
    private user: User;
    private balance?: number;
    private asset?: Asset;
    private participants = [new KeyPair()];
    private requiredSignaturesCount: number = 1;
    private flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer];

    constructor(connection: ConnectionClient, user: User = TestUser.singleSig()) {
        this.connection = connection;
        this.user = user;
    }

    /* Public functions */

    static account(connection: ConnectionClient, user?: User): AccountBuilder {
        return new AccountBuilder(connection, user);
    }

    withAuthFlags(flags: FlagsType[]): AccountBuilder {
        this.flags = flags;
        return this;
    }

    withParticipants(participants: KeyPair[]): AccountBuilder {
        this.participants = participants;
        return this;
    }

    withBalance(asset: Asset, balance: number): AccountBuilder {
        this.asset = asset;
        this.balance = balance;
        return this;
    }

    withRequiredSignatures(count: number): AccountBuilder {
        this.requiredSignaturesCount = count;
        return this;
    }

    async build(): Promise<Account> {
        const account = await this.registerAccount();

        await this.addBalanceIfNeeded(account);

        return account;
    }

    /* Private functions */

    private async registerAccount(): Promise<Account> {
        return await Account.register(
            this.getAuthDescriptor(),
            this.participants,
            this.user,
            this.connection
        );
    }

    private async addBalanceIfNeeded(account) {
        if (this.asset && this.balance) {
            await AssetBalance.giveBalance(account.id_, this.asset.id, this.balance, this.connection)
        }
    }

    private getAuthDescriptor() {
        if (this.requiredSignaturesCount > this.participants.length) {
            throw new Error("Number of required signatures has to be less than number of participants");
        }

        if (this.participants.length > 1) {
            return new MultiSignatureAuthDescriptor(
                this.participants.map(({ pubKey }) => pubKey),
                this.requiredSignaturesCount,
                this.flags
            )
        } else {
            const [participant] = this.participants;
            return new SingleSignatureAuthDescriptor(participant.pubKey, this.flags);
        }
    }
}

export default AccountBuilder;
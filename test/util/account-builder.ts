import {
    Account,
    FlagsType,
    MultiSignatureAuthDescriptor,
    SingleSignatureAuthDescriptor
} from "../../client/lib/ft3/account";
import {gtx} from "../../client/blockchain";
import KeyPair from "../../client/lib/cyptoUtils/keyPair";
import Asset from "../../client/lib/ft3/asset";
import { giveBalance } from "./util";


class AccountBuilder {
    private balance?: number;
    private asset?: Asset;
    private participants = [new KeyPair()];
    private requiredSignaturesCount: number = 1;
    private flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer];

    /* Public functions */

    static account(): AccountBuilder {
        return new AccountBuilder();
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
            gtx
        );
    }

    private async addBalanceIfNeeded(account) {
        if (this.asset && this.balance) {
            await giveBalance(account.id_, this.asset.id, this.balance);
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
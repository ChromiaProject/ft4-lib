import { FlagsType } from "../../client/lib/ft3/user/account-utils";
import MutableAccount from "../../client/lib/ft3/user/mutable-account";
import KeyPair from "../../client/lib/cyptoUtils/keyPair";
import Asset from "../../client/lib/ft3/user/asset";
import User from "../../client/lib/ft3/user/user";
import TestUser from "./test-user";
import SingleSignatureAuthDescriptor from "../../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import MultiSignatureAuthDescriptor from "../../client/lib/ft3/user/auth-descriptor/multi-signature-auth-descriptor";
import AssetBalance from "../../client/lib/ft3/user/asset-balance";
import Blockchain from "../../client/lib/ft3/core/blockchain/blockchain";
import RateLimit from "../../client/lib/ft3/user/rate-limit";

class AccountBuilder {
  private blockchain: Blockchain;
  private user: User;
  private balance?: number;
  private asset?: Asset;
  private participants = [new KeyPair()];
  private requiredSignaturesCount = 1;
  private flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer];
  private points?: number = 0;

  constructor(blockchain: Blockchain, user: User = TestUser.singleSig()) {
    this.blockchain = blockchain;
    this.participants = [user.keyPair];
    this.user = user;
  }

  /* Public functions */

  static account(blockchain: Blockchain, user?: User): AccountBuilder {
    return new AccountBuilder(blockchain, user);
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

  withPoints(points: number): AccountBuilder {
    this.points = points;
    return this;
  }

  withRequiredSignatures(count: number): AccountBuilder {
    this.requiredSignaturesCount = count;
    return this;
  }

  async build(): Promise<MutableAccount> {
    const account = await this.registerAccount();

    await this.addBalanceIfNeeded(account);
    await this.addPointsIfNeeded(account);
    await account.sync();

    return account;
  }

  /* Private functions */

  private async registerAccount(): Promise<MutableAccount> {
    return await MutableAccount.register(
      this.getAuthDescriptor(),
      this.blockchain.newSession(this.user)
    );
  }

  private async addBalanceIfNeeded(account) {
    if (this.asset && this.balance) {
      await AssetBalance.giveBalance(
        account.id,
        this.asset.id,
        this.balance,
        this.blockchain
      );
    }
  }

  private async addPointsIfNeeded(account: MutableAccount) {
    if (this.points > 0) {
      await RateLimit.givePoints(account.id, this.points, this.blockchain);
    }
  }

  private getAuthDescriptor() {
    if (this.requiredSignaturesCount > this.participants.length) {
      throw new Error(
        "Number of required signatures has to be less than number of participants"
      );
    }

    if (this.participants.length > 1) {
      return new MultiSignatureAuthDescriptor(
        this.participants.map(({ pubKey }) => pubKey),
        this.requiredSignaturesCount,
        this.flags,
        this.user.authDescriptor.rule
      );
    } else {
      const [participant] = this.participants;
      return new SingleSignatureAuthDescriptor(
        participant.pubKey,
        this.flags,
        this.user.authDescriptor.rule
      );
    }
  }
}

export default AccountBuilder;

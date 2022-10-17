import {
  FlagsType,
  Account,
  MutableAccount,
  StaticAccount,
  SignatureProvider,
  InMemorySignatureProvider,
  Asset,
  User,
  SingleSignatureAuthDescriptor,
  MultiSignatureAuthDescriptor,
  AssetBalance,
  Blockchain,
  RateLimit,
} from "../../client/lib/ft3";
import TestUser from "./test-user";

class AccountBuilder {
  private blockchain: Blockchain;
  private user: User;
  private balances: AssetBalance[] = [];
  private participants: SignatureProvider[] = [new InMemorySignatureProvider()];
  private requiredSignaturesCount = 1;
  private flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer];
  private points = 0;

  constructor(blockchain: Blockchain, user: User = TestUser.singleSig()) {
    this.blockchain = blockchain;
    this.participants = [user.signatureProvider];
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

  withParticipants(participants: SignatureProvider[]): AccountBuilder {
    this.participants = participants;
    return this;
  }

  withBalance(asset: Asset, amount: number): AccountBuilder {
    this.balances.push(new AssetBalance(amount, asset));
    return this;
  }

  withBalances(balances: AssetBalance[]): AccountBuilder {
    this.balances = this.balances.concat(balances);
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

  async buildStatic(): Promise<StaticAccount> {
    const account = await this.registerStaticAccount();

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

  private async registerStaticAccount(): Promise<StaticAccount> {
    return await StaticAccount.register(
      this.getAuthDescriptor(),
      this.blockchain.newSession(this.user)
    );
  }

  private async addBalanceIfNeeded(account: Account) {
    if (this.balances.length) {
      await Promise.all(
        this.balances.map(async (balance) => {
          await AssetBalance.giveBalance(
            account.id,
            balance.asset.id,
            balance.amount,
            this.blockchain
          );
        })
      );
    }
  }

  private async addPointsIfNeeded(account: Account) {
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
        this.participants.map((participant) => participant.pubKey),
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

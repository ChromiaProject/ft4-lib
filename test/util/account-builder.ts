import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import {
  authDescriptor,
  FlagsType,
} from "../../client/lib/ft3/account/auth-descriptor";
import { AuthDescriptorRule } from "../../client/lib/ft3/account/auth-descriptor/types";
import {
  Asset,
  Balance,
  SupportedNumber,
} from "../../client/lib/ft3/asset/types";
import {
  Account,
  IAuthenticatedAccount,
} from "../../client/lib/ft3/account/types";
import { ftUserSession } from "../../client/lib/ft3/types";
import { gtx } from "postchain-client";
import admin from "./admin_user";
import { createAmount } from "../../client/lib/ft3/asset/amount";
import { createAuthenticatedAccount } from "../../client/lib/ft3/account/account-op-functions";
import { createInMemoryFTKeyStore } from "../../client/lib/ft3/authentication/ft/key-stores/in-memory";
import { createAuthenicator } from "../../client/lib/ft3/authentication";
import {
  createAuthDataService,
  createConnection,
} from "../../client/lib/ft3/ft-session";

class AccountBuilder {
  private session: ftUserSession;
  private balances: Balance[] = [];
  private rules: AuthDescriptorRule | null = null;
  private participants: SignatureProvider[] = [gtx.newSignatureProvider()];
  private requiredSignaturesCount = 1;
  private flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer];
  private points = 0;
  private getUserFromSession = true;

  constructor(session: ftUserSession) {
    this.session = session;
    this.participants = [session.user.signatureProvider];
  }

  /* Public functions */
  static account(session: ftUserSession): AccountBuilder {
    return new AccountBuilder(session);
  }

  withAuthFlags(flags: FlagsType[]): AccountBuilder {
    this.flags = flags;
    return this;
  }

  withParticipants(participants: SignatureProvider[]): AccountBuilder {
    this.getUserFromSession = false;
    this.participants = participants;
    return this;
  }

  withRules(rules: AuthDescriptorRule): AccountBuilder {
    this.rules = rules;
    return this;
  }

  withBalance(
    asset: Asset,
    _amount: Exclude<SupportedNumber, bigint>
  ): AccountBuilder {
    this.balances.push({
      amount: createAmount(_amount, asset.decimals),
      asset,
    });
    return this;
  }

  withBalances(
    balances: { amount: Exclude<SupportedNumber, bigint>; asset: Asset }[]
  ): AccountBuilder {
    this.balances = this.balances.concat(
      balances.map((b) => ({
        amount: createAmount(b.amount, b.asset.decimals),
        asset: b.asset,
      }))
    );
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

  async build(): Promise<Account> {
    const account = await this.registerAccount();
    await this.addBalanceIfNeeded(account);
    await this.addPointsIfNeeded(account);
    return (await this.session.get.account.by.id(account.id))!;
  }

  async buildAuthenticated(): Promise<IAuthenticatedAccount> {
    const account = await this.registerAccount();
    await this.addBalanceIfNeeded(account);
    await this.addPointsIfNeeded(account);
    const connection = createConnection(this.session.get.gtxClient);
    const { signatureProvider, authDescriptor } = this.session.user;
    const keyHandler =
      createInMemoryFTKeyStore(signatureProvider).createKeyHandler(
        authDescriptor
      );
    const authenticator = createAuthenicator(
      account.id,
      [keyHandler],
      createAuthDataService(connection)
    );
    return createAuthenticatedAccount(connection, authenticator);
  }

  /* Private functions */

  private async registerAccount(): Promise<Account> {
    return await this.session.account.admin.register(
      admin(),
      this.getAuthDescriptor()
    );
  }

  private async addBalanceIfNeeded(account: Account) {
    if (this.balances.length) {
      await Promise.all(
        this.balances.map(async (balance) => {
          await this.session.balance.admin.mint(
            admin(),
            balance.asset.id,
            account.id,
            balance.amount
          );
        })
      );
    }
  }

  private async addPointsIfNeeded(account: Account) {
    if (this.points > 0) {
      await this.session.account.admin.givePoints(
        admin(),
        account.id,
        this.points
      );
    }
  }

  private getAuthDescriptor() {
    if (this.requiredSignaturesCount > this.participants.length) {
      throw new Error(
        "Number of required signatures has to be less than number of participants"
      );
    }
    if (this.getUserFromSession) {
      return this.session.user.authDescriptor;
    }
    if (this.participants.length > 1) {
      return authDescriptor.create.multiSig
        .withArgs(
          this.flags,
          this.requiredSignaturesCount,
          this.participants.map((participant) => participant.pubKey)
        )
        .andRules(this.rules);
    } else {
      const [participant] = this.participants;
      return authDescriptor.create.singleSig
        .withArgs(this.flags, participant.pubKey)
        .andRules(this.rules);
    }
  }
}

export default AccountBuilder;

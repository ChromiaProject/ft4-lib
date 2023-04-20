import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import { FlagsType } from "../../client/lib/ft3/account/auth-descriptor";
import { create } from "../../client/lib/ft3/account/auth-descriptor/auth-descriptor";
import { AuthDescriptorRule } from "../../client/lib/ft3/account/auth-descriptor/types";
import { Account } from "../../client/lib/ft3/account/types";
import { Asset, Balance } from "../../client/lib/ft3/asset/types";
import { ftUserSession } from "../../client/lib/ft3/interfaces";
import { gtx } from "postchain-client";
import { giveBalanceOp } from "../../client/lib/ft3/asset/asset-dev-operations";
import { nop } from "../../client/lib/ft3/utils";
import { transactionBuilder } from "../../client/lib/ft3/utils/transaction-builder";

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

  withBalance(asset: Asset, amount: number | bigint): AccountBuilder {
    this.balances.push({ amount: BigInt(amount), asset });
    return this;
  }

  withBalances(balances: Balance[]): AccountBuilder {
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

  async build(): Promise<Account> {
    const account = await this.registerAccount();
    await this.addBalanceIfNeeded(account);
    await this.addPointsIfNeeded(account);
    return await this.session.get.account.by.id(account.id);
  }

  /* Private functions */

  private async registerAccount(): Promise<Account> {
    return await this.session.account.dev.register(this.getAuthDescriptor());
  }

  private async addBalanceIfNeeded(account: Account) {
    if (this.balances.length) {
      const tb = transactionBuilder(
        this.session.user,
        this.session.get.gtxClient
      );

      this.balances.forEach((balance) => {
        tb.add(giveBalanceOp(balance.asset.id, account.id, balance.amount));
      });

      tb.add(nop());
      const tx = await tb.buildSigned();
      await tx.postAndWaitConfirmation();
    }
  }

  private async addPointsIfNeeded(account: Account) {
    if (this.points > 0) {
      await this.session.account.dev.givePoints(account.id, this.points);
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
      return create.multiSig
        .withArgs(
          this.flags,
          this.requiredSignaturesCount,
          this.participants.map((participant) => participant.pubKey)
        )
        .andRules(this.rules);
    } else {
      const [participant] = this.participants;
      return create.singleSig
        .withArgs(this.flags, participant.pubKey)
        .andRules(this.rules);
    }
  }
}

export default AccountBuilder;

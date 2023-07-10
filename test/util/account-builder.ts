import {
  authDescriptor,
  FlagsType,
} from "../../client/lib/ft4/accounts/auth-descriptor";
import { AuthDescriptorRule } from "../../client/lib/ft4/accounts/auth-descriptor/types";
import {
  Asset,
  Balance,
  SupportedNumber,
} from "../../client/lib/ft4/asset/types";
import {
  Account,
  AuthenticatedAccount,
} from "../../client/lib/ft4/accounts/types";
import { gtx, newSignatureProvider, SignatureProvider } from "postchain-client";
import admin from "./admin_user";
import { createAmount } from "../../client/lib/ft4/asset/amount";
import { createAuthenticatedAccount } from "../../client/lib/ft4/accounts/account-op-functions";
import { createInMemoryFtKeyStore } from "../../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createAuthenticator } from "../../client/lib/ft4/authentication";
import {
  createAuthDataService,
  createConnection,
} from "../../client/lib/ft4/ft-session";
import { createChromiaClient } from "./blockchain-util";
import { Connection } from "/ft4/types";
import {
  addRateLimitPoints,
  registerAccount,
} from "/ft4/admin/admin-op-functions";

class AccountBuilder {
  private connection: Connection;
  private balances: Balance[] = [];
  private rules: AuthDescriptorRule | null = null;
  private participants: SignatureProvider[] = [gtx.newSignatureProvider()];
  private requiredSignaturesCount = 1;
  private flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer];
  private points = 0;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /* Public functions */
  static account(connection: Connection): AccountBuilder {
    return new AccountBuilder(connection);
  }

  withAuthFlags(flags: FlagsType[]): AccountBuilder {
    this.flags = flags;
    return this;
  }

  withParticipants(participants: SignatureProvider[]): AccountBuilder {
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

  async buildAsAdmin(): Promise<Account> {
    if (this.rules === null)
      throw "You cannot add rules to admin auth descriptors.";
    const account = await this.registerAndBuildAdminAuthenticated();
    await this.addBalanceIfNeeded(account);
    await this.addPointsIfNeeded(account);
    return account;
  }

  async buildAuthenticated(): Promise<AuthenticatedAccount> {
    const admin = [newSignatureProvider()];
    const account = await this.registerAndBuildAdminAuthenticated(admin, 1);
    const ad = this.getAuthDescriptor();
    await account.addAuthDescriptor(ad, this.participants);
    const connection = createConnection(await createChromiaClient());
    const keyHandlers = this.participants.map((sig) =>
      createInMemoryFtKeyStore(sig).createKeyHandler(ad)
    );
    const authenticator = createAuthenticator(
      account.id,
      keyHandlers,
      createAuthDataService(connection)
    );
    return createAuthenticatedAccount(connection, authenticator);
  }

  /* Private functions */
  private async registerAndBuildAdminAuthenticated(
    adminSigProvs = this.participants,
    adminSignaturesRequired = this.requiredSignaturesCount
  ): Promise<AuthenticatedAccount> {
    const ad = this.getAccountAdminAuthDescriptor(
      adminSigProvs,
      adminSignaturesRequired
    );
    await registerAccount(
      this.connection.client,
      admin().signatureProvider,
      ad
    );
    const account = await this.connection.getAccountById(ad.id);
    const connection = createConnection(await createChromiaClient());
    const keyHandlers = adminSigProvs.map((sig) =>
      createInMemoryFtKeyStore(sig).createKeyHandler(ad)
    );
    const authenticator = createAuthenticator(
      account.id,
      keyHandlers,
      createAuthDataService(connection)
    );
    return createAuthenticatedAccount(connection, authenticator);
  }

  private async addBalanceIfNeeded(account: Account) {
    if (this.balances.length) {
      const adminSignatureProvider = admin().signatureProvider;
      const tx = {
        operations: [],
        signers: [adminSignatureProvider.pubKey],
      };

      this.balances.forEach(async (balance) => {
        tx.operations.push(
          "ft4.admin.mint",
          account.id,
          balance.asset.id,
          balance.amount.value
        );
      });

      await this.connection.client.signAndSendUniqueTransaction(
        tx,
        adminSignatureProvider
      );
    }
  }

  private async addPointsIfNeeded(account: Account) {
    if (this.points > 0) {
      const adminSignatureProvider = admin().signatureProvider;
      await addRateLimitPoints(
        this.connection.client,
        adminSignatureProvider,
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

  private getAccountAdminAuthDescriptor(
    adminSigProvs = this.participants,
    adminSignaturesRequired = this.requiredSignaturesCount
  ) {
    if (adminSigProvs.length > 1) {
      return authDescriptor.create.multiSig.withArgs(
        this.flags,
        adminSignaturesRequired,
        adminSigProvs.map((participant) => participant.pubKey)
      ).andNoRules;
    } else {
      const [participant] = adminSigProvs;
      return authDescriptor.create.singleSig.withArgs(
        this.flags,
        participant.pubKey
      ).andNoRules;
    }
  }
}

export default AccountBuilder;

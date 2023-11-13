import { authDescriptor, FlagsType } from "/ft4/accounts/auth-descriptor";
import {
  AuthDescriptor,
  AuthDescriptorRule,
} from "/ft4/accounts/auth-descriptor/types";
import { Asset, Balance, SupportedNumber } from "/ft4/asset/types";
import { Account, AuthenticatedAccount } from "/ft4/accounts/types";
import {
  gtx,
  KeyPair,
  newSignatureProvider,
  SignatureProvider,
} from "postchain-client";
import admin from "./admin_user";
import { createAmount } from "/ft4/asset/amount";
import { createAuthenticatedAccount } from "/ft4/accounts/account-op-functions";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createAuthenticator, ftAuth } from "/ft4/authentication";
import { createAuthDataService } from "/ft4/ft-session";
import { Connection } from "/ft4/types";
import {
  addRateLimitPoints,
  registerAccount,
} from "/ft4/admin/admin-op-functions";
import { nop } from "/ft4/utils";
import { addAuthDescriptor } from "/ft4/accounts/account-operations";
import { op } from "/ft4";

class AccountBuilder {
  private connection: Connection;
  private balances: Balance[] = [];
  private rules: AuthDescriptorRule | null = null;
  private participant: SignatureProvider = gtx.newSignatureProvider();
  private authDescInfo: {
    authDescriptor: AuthDescriptor;
    signers: (SignatureProvider | KeyPair)[];
  };
  private flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer];
  private points = 0;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /* Public functions */
  static account(connection: Connection): AccountBuilder {
    return new AccountBuilder(connection);
  }

  withAuthFlags(...flags: FlagsType[]): AccountBuilder {
    this.flags = flags;
    return this;
  }

  withAuthDescriptor(
    //this will never be the manager
    authDescriptor: AuthDescriptor,
    signers: (SignatureProvider | KeyPair)[],
  ): AccountBuilder {
    this.authDescInfo = { authDescriptor, signers };
    return this;
  }

  withParticipant(participant: SignatureProvider): AccountBuilder {
    this.participant = participant;
    return this;
  }

  withRules(rules: AuthDescriptorRule): AccountBuilder {
    this.rules = rules;
    return this;
  }

  withBalance(
    asset: Asset,
    _amount: Exclude<SupportedNumber, bigint>,
  ): AccountBuilder {
    this.balances.push({
      amount: createAmount(_amount, asset.decimals),
      asset,
    });
    return this;
  }

  withBalances(
    balances: { amount: Exclude<SupportedNumber, bigint>; asset: Asset }[],
  ): AccountBuilder {
    this.balances = this.balances.concat(
      balances.map((b) => ({
        amount: createAmount(b.amount, b.asset.decimals),
        asset: b.asset,
      })),
    );
    return this;
  }

  withPoints(points: number): AccountBuilder {
    this.points = points;
    return this;
  }

  async build(): Promise<AuthenticatedAccount> {
    if (this.rules !== null)
      throw "You cannot add rules to manager auth descriptors.";

    const account = await this.registerAndBuildManagerAuthenticated();

    await this.addBalanceIfNeeded(account);
    await this.addPointsIfNeeded(account);
    return account;
  }

  async buildAsNonManager(): Promise<AuthenticatedAccount> {
    const manager = newSignatureProvider();
    const accountManager = await this.registerAndBuildManagerAuthenticated(
      manager,
    );
    const ad = this.getAuthDescriptor();
    await accountManager.addAuthDescriptor(ad, this.participant);

    const keyHandler = createInMemoryFtKeyStore(
      this.participant,
    ).createKeyHandler(ad);
    const authenticator = createAuthenticator(
      accountManager.id,
      [keyHandler],
      createAuthDataService(this.connection),
    );
    return createAuthenticatedAccount(this.connection, authenticator);
  }

  /* Private functions */
  private async registerAndBuildManagerAuthenticated(
    managerSigProv = this.participant,
  ): Promise<AuthenticatedAccount> {
    const ad = this.getAccountManagerAuthDescriptor(managerSigProv);
    await registerAccount(
      this.connection.client,
      admin().signatureProvider,
      ad,
    );
    const account = await this.connection.getAccountById(ad.id);
    const keyHandler =
      createInMemoryFtKeyStore(managerSigProv).createKeyHandler(ad);

    const authenticator = createAuthenticator(
      account.id,
      [keyHandler],
      createAuthDataService(this.connection),
    );

    const acc = createAuthenticatedAccount(this.connection, authenticator);

    await this.addAuthDescriptorIfNeeded(acc, managerSigProv);

    return acc;
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
          op(
            "ft4.admin.mint",
            account.id,
            balance.asset.id,
            balance.amount.value,
          ),
        );
      });

      await this.connection.client.signAndSendUniqueTransaction(
        tx,
        adminSignatureProvider,
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
        this.points,
      );
    }
  }

  private async addAuthDescriptorIfNeeded(
    account: Account,
    managerSigProvider: SignatureProvider,
  ) {
    if (this.authDescInfo) {
      const tx = {
        operations: [
          ftAuth(account.id, account.id),
          addAuthDescriptor(this.authDescInfo.authDescriptor),
          nop(),
        ],
        signers: [
          managerSigProvider.pubKey,
          ...this.authDescInfo.signers.map((s) => s.pubKey),
        ],
      };

      let signedTx = await this.connection.client.signTransaction(
        tx,
        managerSigProvider,
      );
      for (const signer of this.authDescInfo.signers) {
        signedTx = await this.connection.client.signTransaction(
          signedTx,
          signer,
        );
      }
      await this.connection.client.sendTransaction(signedTx);
    }
  }

  private getAuthDescriptor() {
    return authDescriptor.create.singleSig
      .withArgs(this.flags, this.participant.pubKey)
      .andRules(this.rules);
  }

  private getAccountManagerAuthDescriptor(managerSigProv = this.participant) {
    return authDescriptor.create.singleSig.withArgs(
      [...new Set(this.flags.concat(FlagsType.Account))],
      managerSigProv.pubKey,
    ).andNoRules;
  }
}

export default AccountBuilder;

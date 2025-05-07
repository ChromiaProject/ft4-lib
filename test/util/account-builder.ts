import {
  Account,
  AnyAuthDescriptorRegistration,
  AuthDescriptorRules,
  AuthFlag,
  AuthenticatedAccount,
  addAuthDescriptor,
  createAuthenticatedAccount,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts";
import { addRateLimitPoints, registerAccountAdmin } from "@ft4/admin";
import { Asset, Balance, SupportedNumber, createAmount } from "@ft4/asset";
import {
  createAuthenticator,
  createInMemoryFtKeyStore,
  ftAuth,
} from "@ft4/authentication";
import {
  Connection,
  createAuthDataService,
  createConnection,
} from "@ft4/ft-session";
import { nop, op } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  KeyPair,
  MERKLE_HASH_VERSIONS,
  Operation,
  SignatureProvider,
  gtx,
  newSignatureProvider,
} from "postchain-client";
import {
  adminUser,
  getAccountIdFromAuthDescriptor,
  testAdFromRegistration,
} from "./util";

export class AccountBuilder {
  private connection: Connection;
  private balances: Balance[] = [];
  private rules: AuthDescriptorRules | null = null;
  private merkleHashVersion: number;
  private signer: SignatureProvider;
  private authDescInfo: {
    authDescriptor: AnyAuthDescriptorRegistration;
    signers: (SignatureProvider | KeyPair)[];
  };
  private flags: string[] = [AuthFlag.Account, AuthFlag.Transfer];
  private points = 0;

  constructor(
    connection: Connection,
    merkleHashVersion: number = MERKLE_HASH_VERSIONS.ONE,
  ) {
    this.connection = connection;
    this.merkleHashVersion = merkleHashVersion;
    this.signer = gtx.newSignatureProvider(this.merkleHashVersion);
  }

  /* Public functions */
  static account(
    connection: Connection,
    merkleHashVersion: number = MERKLE_HASH_VERSIONS.ONE,
  ): AccountBuilder {
    return new AccountBuilder(connection, merkleHashVersion);
  }

  withAuthFlags(...flags: string[]): AccountBuilder {
    this.flags = flags;
    return this;
  }

  withAuthDescriptor(
    //this will never be the manager
    authDescriptor: AnyAuthDescriptorRegistration,
    signers: (SignatureProvider | KeyPair)[],
  ): AccountBuilder {
    this.authDescInfo = { authDescriptor, signers };
    return this;
  }

  withSigner(signer: SignatureProvider): AccountBuilder {
    this.signer = signer;
    return this;
  }

  withRules(rules: AuthDescriptorRules): AccountBuilder {
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
    const manager = newSignatureProvider(MERKLE_HASH_VERSIONS.ONE);
    const accountManager =
      await this.registerAndBuildManagerAuthenticated(manager);
    const ad = this.getAuthDescriptorRegistration();
    const keyStore = createInMemoryFtKeyStore(this.signer);
    await accountManager.addAuthDescriptor(ad, keyStore);

    const keyHandler = keyStore.createKeyHandler(testAdFromRegistration(ad));
    const authenticator = createAuthenticator(
      accountManager.id,
      [keyHandler],
      createAuthDataService(this.connection),
    );
    return createAuthenticatedAccount(this.connection, authenticator);
  }

  /* Private functions */
  private async registerAndBuildManagerAuthenticated(
    managerSigProv = this.signer,
  ): Promise<AuthenticatedAccount> {
    const ad = this.getAccountManagerAuthDescriptor(managerSigProv);
    await registerAccountAdmin(
      this.connection.client,
      adminUser(this.merkleHashVersion).signatureProvider,
      ad,
    );
    const account = await this.connection.getAccountById(
      getAccountIdFromAuthDescriptor(ad),
    );
    const keyHandler = createInMemoryFtKeyStore(
      managerSigProv,
    ).createKeyHandler(testAdFromRegistration(ad));

    const authenticator = createAuthenticator(
      account!.id,
      [keyHandler],
      createAuthDataService(createConnection(this.connection.client)),
    );

    const acc = createAuthenticatedAccount(this.connection, authenticator);

    await this.addAuthDescriptorIfNeeded(acc, managerSigProv);

    return acc;
  }

  private async addBalanceIfNeeded(account: Account) {
    if (this.balances.length) {
      const adminSignatureProvider = adminUser(
        this.merkleHashVersion,
      ).signatureProvider;
      const tx: { operations: Operation[]; signers: Buffer[] } = {
        operations: [],
        signers: [adminSignatureProvider.pubKey],
      };

      this.balances.forEach((balance) => {
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
      const adminSignatureProvider = adminUser(
        this.merkleHashVersion,
      ).signatureProvider;
      await addRateLimitPoints(
        this.connection.client,
        adminSignatureProvider,
        account.id,
        this.points,
      );
    }
  }

  private async addAuthDescriptorIfNeeded(
    account: AuthenticatedAccount,
    managerSigProvider: SignatureProvider,
  ) {
    if (this.authDescInfo) {
      const tx = {
        operations: [
          ftAuth(
            account.id,
            account.authenticator.keyHandlers[0].authDescriptor.id,
          ),
          addAuthDescriptor(this.authDescInfo.authDescriptor),
          nop(),
        ],
        signers: [
          managerSigProvider.pubKey,
          ...this.authDescInfo.signers
            .map((s) => s.pubKey)
            .filter((pk): pk is Buffer => pk !== undefined),
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

  private getAccountManagerAuthDescriptor(managerSigProv = this.signer) {
    return createSingleSigAuthDescriptorRegistration(
      this.flags.concat(AuthFlag.Account),
      managerSigProv.pubKey,
      null,
    );
  }

  private getAuthDescriptorRegistration() {
    return createSingleSigAuthDescriptorRegistration(
      this.flags,
      this.signer.pubKey,
      this.rules,
    );
  }
}

export default AccountBuilder;

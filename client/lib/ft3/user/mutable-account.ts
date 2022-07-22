import AssetBalance from "./asset-balance";
import AccountTransactions from "./account-transactions";
import PaymentHistory from "./payment-history/payment-history";
import PaymentHistoryIterator from "./payment-history/payment-history-iterator";
import PaymentHistorySyncManager from "./payment-history/payment-history-sync-manager";
import BlockchainSession from "../core/blockchain/blockchain-session";
import Blockchain from "../core/blockchain/blockchain";
import { addAuthDescriptor } from "./account-operations";
import { register } from "./account-dev-operations";
import {
  accountById,
  accountsByAuthDescriptorId,
  accountsByParticipantId,
} from "./account-queries";
import RateLimit from "./rate-limit";
import User from "./user";
import { Account, AuthDescriptor, GtvSerializable } from "./account-utils";
import StaticAccount from "./static-account";

export default class MutableAccount implements Account {
  readonly paymentHistorySyncManager = new PaymentHistorySyncManager();

  private account: StaticAccount;
  readonly tx: AccountTransactions;

  constructor(
    id: Buffer,
    authDescriptor: AuthDescriptor[],
    session: BlockchainSession
  ) {
    this.account = new StaticAccount(id, authDescriptor, session.blockchain);
    this.tx = new AccountTransactions(id, session);
  }

  get id(): Buffer {
    return this.account.id;
  }

  get blockchain(): Blockchain {
    return this.tx.session.blockchain;
  }

  get session(): BlockchainSession {
    return this.tx.session;
  }

  get user(): User {
    return this.tx.session.user;
  }

  get assets(): AssetBalance[] {
    return this.account.assets;
  }

  get authDescriptor(): AuthDescriptor[] {
    return this.account.authDescriptor;
  }

  get rateLimit(): RateLimit {
    return this.account.rateLimit;
  }

  static async getByParticipantId(
    id: Buffer,
    session: BlockchainSession
  ): Promise<MutableAccount[]> {
    const accountIds = await session.query(...accountsByParticipantId(id));
    return await this.getByIds(
      accountIds.map((id) => Buffer.from(id, "hex")),
      session
    );
  }

  static async getByAuthDescriptorId(
    id: Buffer,
    session: BlockchainSession
  ): Promise<MutableAccount[]> {
    const accountIds = await session.query(...accountsByAuthDescriptorId(id));
    return await this.getByIds(
      accountIds.map((id) => Buffer.from(id, "hex")),
      session
    );
  }

  static async register(
    authDescriptor: AuthDescriptor,
    session: BlockchainSession
  ): Promise<MutableAccount> {
    await session.call(register(authDescriptor));
    const account = new MutableAccount(
      authDescriptor.hash(),
      [authDescriptor],
      session
    );
    await account.sync();
    return account;
  }

  static async rawTransactionRegister(
    user: User,
    authDescriptor: AuthDescriptor,
    blockchain: Blockchain
  ): Promise<Buffer> {
    const tx = await blockchain
      .transactionBuilder()
      .add(register(user.authDescriptor))
      .add(
        addAuthDescriptor(
          user.authDescriptor.id,
          user.authDescriptor.id,
          authDescriptor
        )
      )
      .build([user.authDescriptor.signers, authDescriptor.signers].flat())
      .sign(user.signatureProvider);
    return tx.raw();
  }

  static async rawTransactionAddAuthDescriptor(
    accountId: Buffer,
    user: User,
    authDescriptor: AuthDescriptor,
    blockchain: Blockchain
  ): Promise<Buffer> {
    const tx = await blockchain
      .transactionBuilder()
      .add(addAuthDescriptor(accountId, user.authDescriptor.id, authDescriptor))
      .build([user.authDescriptor.signers, authDescriptor.signers].flat())
      .sign(user.signatureProvider);
    return tx.raw();
  }

  static async getByIds(
    ids: Buffer[],
    session: BlockchainSession
  ): Promise<MutableAccount[]> {
    return Promise.all(ids.map((id) => this.getById(id, session)));
  }

  static async getById(
    id: Buffer,
    session: BlockchainSession
  ): Promise<MutableAccount> {
    const account = await session.query(...accountById(id));

    if (!account) {
      return null;
    }

    const acc = new MutableAccount(id, [], session);
    await acc.sync();
    return acc;
  }

  async addAuthDescriptor(authDescriptor: AuthDescriptor): Promise<void> {
    const tx = await this.tx.addAuthDescriptor(authDescriptor);
    await tx.post();
    await this.account.sync();
  }

  async isAuthDescriptorValid(id: Buffer): Promise<boolean> {
    return await this.session.query("ft3.is_auth_descriptor_valid", {
      account_id: this.id,
      auth_descriptor_id: id,
    });
  }

  async deleteAllAuthDescriptorsExclude(
    authDescriptor: AuthDescriptor
  ): Promise<void> {
    const tx = await this.tx.deleteAllAuthDescriptorsExclude(authDescriptor);
    await tx.post();
    await this.account.sync();
  }

  async deleteAuthDescriptor(authDescriptor: AuthDescriptor): Promise<void> {
    const tx = await this.tx.deleteAuthDescriptor(authDescriptor);
    await tx.post();
    await this.sync();
  }

  async sync(): Promise<void> {
    await this.account.sync();
  }

  getAssetById(id: Buffer): AssetBalance {
    return this.account.getAssetById(id);
  }

  async transferInputsToOutputs(
    inputs: Array<GtvSerializable>,
    outputs: Array<GtvSerializable>
  ): Promise<void> {
    const tx = await this.tx.transferInputsToOutputs(inputs, outputs);
    await tx.post();
    await this.sync();
  }

  async transfer(
    accountId: Buffer,
    assetId: Buffer,
    amount: number
  ): Promise<void> {
    const input = [this.id, assetId, this.user.authDescriptor.id, amount, []];

    const output = [accountId, assetId, amount, []];

    await this.transferInputsToOutputs([input], [output]);
  }

  async burnTokens(assetId, amount): Promise<void> {
    const input = [this.id, assetId, this.user.authDescriptor.id, amount, []];

    await this.transferInputsToOutputs([input], []);
  }

  async getPaymentHistory(): Promise<any[]> {
    return await PaymentHistory.getByAccountId(this.id, -1, this.blockchain);
  }

  async getPaymentHistoryIterator(pageSize): Promise<PaymentHistoryIterator> {
    if (pageSize < 1) throw new Error("Page size has to be greater than 1");
    await this.paymentHistorySyncManager.syncAccount(this.id, this.blockchain);
    return this.paymentHistorySyncManager.paymentHistoryStore.getIterator(
      this.blockchain.id,
      this.id,
      pageSize
    );
  }

  async xcTransfer(
    destinationChainId: Buffer,
    destinationAccountId: Buffer,
    assetId: Buffer,
    amount: number
  ): Promise<void> {
    const tx = await this.tx.xcTransfer(
      destinationChainId,
      destinationAccountId,
      assetId,
      amount
    );
    await tx.post();
    await this.sync();
  }
}

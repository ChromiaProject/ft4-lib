import AssetBalance from "./asset-balance";
import AuthDescriptorFactory from "./auth-descriptor/auth-descriptor-factory";
import PaymentHistory from "./payment-history/payment-history";
import PaymentHistoryIterator from "./payment-history/payment-history-iterator";
import PaymentHistorySyncManager from "./payment-history/payment-history-sync-manager";
import Blockchain from "../core/blockchain/blockchain";
import {
  accountAuthDescriptors,
  accountById,
  accountsByAuthDescriptorId,
  accountsByParticipantId,
} from "./account-queries";
import RateLimit from "./rate-limit";
import { Account, AuthDescriptor } from "./account-utils";

export default class StaticAccount implements Account {
  readonly paymentHistorySyncManager = new PaymentHistorySyncManager();

  readonly id: Buffer;
  assets: AssetBalance[] = [];
  authDescriptor: AuthDescriptor[];
  rateLimit: RateLimit;
  readonly blockchain: Blockchain;

  constructor(
    id: Buffer,
    authDescriptor: AuthDescriptor[],
    blockchain: Blockchain
  ) {
    this.id = id;
    this.authDescriptor = authDescriptor;
    this.blockchain = blockchain;
  }

  static async getByParticipantId(
    id: Buffer,
    blockchain: Blockchain
  ): Promise<StaticAccount[]> {
    const accountIds = await blockchain.query(...accountsByParticipantId(id));
    return await this.getByIds(
      accountIds.map((id) => Buffer.from(id, "hex")),
      blockchain
    );
  }

  static async getByAuthDescriptorId(
    id: Buffer,
    blockchain: Blockchain
  ): Promise<StaticAccount[]> {
    const accountIds = await blockchain.query(
      ...accountsByAuthDescriptorId(id)
    );
    return await this.getByIds(
      accountIds.map((id) => Buffer.from(id, "hex")),
      blockchain
    );
  }

  static async getByIds(
    ids: Buffer[],
    blockchain: Blockchain
  ): Promise<StaticAccount[]> {
    return Promise.all(ids.map((id) => this.getById(id, blockchain)));
  }

  static async getById(
    id: Buffer,
    blockchain: Blockchain
  ): Promise<StaticAccount> {
    const account = await blockchain.query(...accountById(id));

    if (!account) {
      return null;
    }

    const acc = new StaticAccount(id, [], blockchain);
    await acc.sync();
    return acc;
  }

  async isAuthDescriptorValid(id: Buffer): Promise<boolean> {
    return await this.blockchain.query("ft3.is_auth_descriptor_valid", {
      account_id: this.id,
      auth_descriptor_id: id,
    });
  }

  async sync(): Promise<void> {
    await Promise.all([
      this.syncAssets(),
      this.syncAuthDescriptors(),
      this.syncRateLimit(),
    ]);
  }

  private async syncAssets(): Promise<void> {
    this.assets = await AssetBalance.getByAccountId(this.id, this.blockchain);
  }

  private async syncAuthDescriptors(): Promise<void> {
    const authDescriptors = await this.blockchain.query(
      ...accountAuthDescriptors(this.id)
    );

    const authDescriptorFactory = new AuthDescriptorFactory();
    this.authDescriptor = authDescriptors.map((authDescriptor) =>
      authDescriptorFactory.create(
        authDescriptor.type,
        Buffer.from(authDescriptor.args, "hex")
      )
    );
  }

  private async syncRateLimit(): Promise<void> {
    this.rateLimit = await RateLimit.getByAccountRateLimit(
      this.id,
      this.blockchain
    );
  }

  getAssetById(id: Buffer): AssetBalance {
    return this.assets.find(
      (assetBalance) => assetBalance.asset.id.compare(id) === 0
    );
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
}

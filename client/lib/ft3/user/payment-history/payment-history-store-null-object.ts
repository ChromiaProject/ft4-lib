import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryIterator from "./payment-history-iterator";

export default class PaymentHistoryStoreNullObject
  implements PaymentHistoryStore
{
  get(
    blockchainId: Buffer,
    accountId: Buffer,
    start: number,
    pageSize: number
  ): PaymentHistoryEntry[] {
    return [];
  }

  getCount(blockchainId: Buffer, accountId: Buffer): number {
    return 0;
  }

  getIterator(
    blockchainId: Buffer,
    accountId: Buffer,
    pageSize: number
  ): PaymentHistoryIterator {
    return new PaymentHistoryIterator(this, blockchainId, accountId, pageSize);
  }

  getSyncInfo(blockchainId: Buffer, accountId: Buffer): any {
    return {};
  }

  save(
    blockchainId: Buffer,
    accountId: Buffer,
    paymentHistoryEntries: PaymentHistoryEntry[]
  ) {}

  saveSyncInfo(blockchainId: Buffer, accountId: Buffer, syncInfo: any) {}

  deletePaymentHistory(accountId: Buffer, blockchainId: Buffer) {}
}

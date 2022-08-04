/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function */
import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryIterator from "./payment-history-iterator";

export default class PaymentHistoryStoreNullObject
  implements PaymentHistoryStore
{
  get(
    brid: Buffer,
    accountId: Buffer,
    start: number,
    pageSize: number
  ): PaymentHistoryEntry[] {
    return [];
  }

  getCount(brid: Buffer, accountId: Buffer): number {
    return 0;
  }

  getIterator(
    brid: Buffer,
    accountId: Buffer,
    pageSize: number
  ): PaymentHistoryIterator {
    return new PaymentHistoryIterator(this, brid, accountId, pageSize);
  }

  getSyncInfo(brid: Buffer, accountId: Buffer): any {
    return {};
  }

  save(
    brid: Buffer,
    accountId: Buffer,
    paymentHistoryEntries: PaymentHistoryEntry[]
  ) {}

  saveSyncInfo(brid: Buffer, accountId: Buffer, syncInfo: any) {}

  deletePaymentHistory(accountId: Buffer, brid: Buffer) {}
}

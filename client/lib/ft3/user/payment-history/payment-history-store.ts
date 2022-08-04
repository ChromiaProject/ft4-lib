import PaymentHistoryIterator from "./payment-history-iterator";
import PaymentHistoryEntry from "./payment-history-entry";

export default interface PaymentHistoryStore {
  getCount(brid: Buffer, accountId: Buffer): number;
  getIterator(
    brid: Buffer,
    accountId: Buffer,
    pageSize: number
  ): PaymentHistoryIterator;
  save(
    brid: Buffer,
    accountId: Buffer,
    paymentHistoryEntries: PaymentHistoryEntry[]
  );
  get(
    brid: Buffer,
    accountId: Buffer,
    start: number,
    pageSize: number
  ): PaymentHistoryEntry[];
  getSyncInfo(brid: Buffer, accountId: Buffer): any;
  saveSyncInfo(brid: Buffer, accountId: Buffer, syncInfo: any);
  deletePaymentHistory(accountId: Buffer, brid?: Buffer);
}

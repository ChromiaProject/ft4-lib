import PaymentHistoryIterator from "./payment-history-iterator";
import PaymentHistoryEntry from "./payment-history-entry";

export default interface PaymentHistoryStore {
  getCount(blockchainId: Buffer, accountId: Buffer): number;
  getIterator(
    blockchainId: Buffer,
    accountId: Buffer,
    pageSize: number
  ): PaymentHistoryIterator;
  save(
    blockchainId: Buffer,
    accountId: Buffer,
    paymentHistoryEntries: PaymentHistoryEntry[]
  );
  get(
    blockchainId: Buffer,
    accountId: Buffer,
    start: number,
    pageSize: number
  ): PaymentHistoryEntry[];
  getSyncInfo(blockchainId: Buffer, accountId: Buffer): any;
  saveSyncInfo(blockchainId: Buffer, accountId: Buffer, syncInfo: any);
  deletePaymentHistory(accountId: Buffer, blockchainId?: Buffer);
}

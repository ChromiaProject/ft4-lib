import PaymentHistoryIterator from "./payment-history-iterator";
import PaymentHistoryEntry from "./payment-history-entry";

export default interface PaymentHistoryStore {
    getCount(accountId: Buffer): number;
    getIterator(accountId: Buffer, pageSize: number): PaymentHistoryIterator;
    save(accountId: Buffer, paymentHistoryEntries: PaymentHistoryEntry[]);
    get(accountId: Buffer, start: number, pageSize: number): PaymentHistoryEntry[];
    getSyncInfo(accountId: Buffer): any;
    saveSyncInfo(accountId: Buffer, syncInfo: any);
}

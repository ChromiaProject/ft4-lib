import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryIterator from "./payment-history-iterator";


export default class PaymentHistoryStoreMemory implements PaymentHistoryStore {
    private entriesCache: {[key: string]: PaymentHistoryEntry[]} = {};
    private syncInfo: {[key: string]: any} = {};

    get(accountId: Buffer, start: number, pageSize: number): PaymentHistoryEntry[] {
        const entries = this.entriesCache[accountId.toString('hex').toUpperCase()];
        if (entries.length < start) { return [] }
        return entries.slice(start, Math.min(entries.length, start + pageSize));
    }

    getCount(accountId: Buffer): number {
        return (this.entriesCache[accountId.toString('hex').toUpperCase()] || []).length;
    }

    getIterator(accountId: Buffer, pageSize: number): PaymentHistoryIterator {
        return new PaymentHistoryIterator(this, accountId, pageSize);
    }

    getSyncInfo(accountId: Buffer): any {
        return this.syncInfo[accountId.toString('hex').toUpperCase()] || {};
    }

    save(accountId: Buffer, paymentHistoryEntries: PaymentHistoryEntry[]) {
        const entries = this.entriesCache[accountId.toString('hex').toUpperCase()] || [];
        this.entriesCache[accountId.toString('hex').toUpperCase()] = paymentHistoryEntries.concat(entries);
    }

    saveSyncInfo(accountId: Buffer, syncInfo: any) {
        this.syncInfo[accountId.toString('hex').toUpperCase()] = syncInfo;
    }
}
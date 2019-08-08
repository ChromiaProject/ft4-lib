import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryIterator from "./payment-history-iterator";
import PaymentHistoryEntry from "./payment-history-entry";

class LocalStorageMock {

    store = {};

    clear() {
        this.store = {};
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        this.store[key] = value.toString();
    }

    removeItem(key) {
        delete this.store[key];
    }
}

const localStorage = new LocalStorageMock();

export default class PaymentHistoryStoreLocalStorage implements PaymentHistoryStore {

    private entriesCache: {[key: string]: PaymentHistoryEntry[]} = {};

    getCount(accountId: Buffer): number {
        return this.getEntriesFor(accountId).length;
    }

    getIterator(accountId: Buffer, pageSize: number): PaymentHistoryIterator {
        return new PaymentHistoryIterator(this, accountId, pageSize);
    }

    save(accountId: Buffer, paymentHistoryEntries: PaymentHistoryEntry[]) {
        const entries = this.loadFromStore(accountId);
        const newEntries = paymentHistoryEntries.concat(entries);
        this.saveToStore(accountId, newEntries);
        this.entriesCache[accountId.toString('hex').toUpperCase()] = newEntries;
    }

    get(accounId: Buffer, start: number, pageSize: number): PaymentHistoryEntry[] {
        const entries = this.getEntriesFor(accounId);
        if (entries.length < start) { return [] }
        return entries.slice(start, Math.min(entries.length, start + pageSize));
    }

    private getEntriesFor(accountId: Buffer): PaymentHistoryEntry[] {
        const accountIdString = accountId.toString('hex').toUpperCase();
        let entries = this.entriesCache[accountIdString];

        if (!entries) {
            entries = this.loadFromStore(accountId);
            this.entriesCache[accountIdString] = entries;
        }

        return entries;
    }

    private loadFromStore(id: Buffer): PaymentHistoryEntry[] {
        const key = `FT3_LIB_P_H_${id.toString('hex').toUpperCase()}`;
        const value = localStorage.getItem(key);
        const entries = value ? JSON.parse(value) : [];
        return entries.map(this.mapToPaymentHistoryEntry);
    }

    private saveToStore(id: Buffer, entries: PaymentHistoryEntry[]) {
        const key = `FT3_LIB_P_H_${id.toString('hex').toUpperCase()}`;
        localStorage.setItem(key, JSON.stringify(entries.map(entry => entry.adaptForSerialization())))
    }

    private mapToPaymentHistoryEntry(entry: any): PaymentHistoryEntry {
        return new PaymentHistoryEntry(
            entry.isInput,
            entry.delta,
            entry.asset,
            Buffer.from(entry.assetId, 'hex'),
            Buffer.from(entry.chainId, 'hex'),
            entry.other,
            new Date(entry.timestamp),
            Buffer.from(entry.transactionId, 'hex'),
            entry.blockHeight
        );
    }
}

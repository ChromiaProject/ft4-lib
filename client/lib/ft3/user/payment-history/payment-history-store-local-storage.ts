import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryIterator from "./payment-history-iterator";
import PaymentHistoryEntry from "./payment-history-entry";

export default class PaymentHistoryStoreLocalStorage implements PaymentHistoryStore {

    private entriesCache: {[key: string]: PaymentHistoryEntry[]} = {};

    getCount(blockchainId: Buffer, accountId: Buffer): number {
        return this.getEntriesFor(blockchainId, accountId).length;
    }

    getIterator(blockchainId: Buffer, accountId: Buffer, pageSize: number): PaymentHistoryIterator {
        return new PaymentHistoryIterator(this, blockchainId, accountId, pageSize);
    }

    save(blockchainId: Buffer, accountId: Buffer, paymentHistoryEntries: PaymentHistoryEntry[]) {
        const entries = this.loadFromStore(blockchainId, accountId);
        const newEntries = paymentHistoryEntries.concat(entries);
        this.saveToStore(blockchainId, accountId, newEntries);
        this.entriesCache[this.paymentHistoryKey(blockchainId, accountId)] = newEntries;
    }

    get(blockchainId: Buffer, accounId: Buffer, start: number, pageSize: number): PaymentHistoryEntry[] {
        const entries = this.getEntriesFor(blockchainId, accounId);
        if (entries.length < start) { return [] }
        return entries.slice(start, Math.min(entries.length, start + pageSize));
    }

    getSyncInfo(blockchainId: Buffer, accountId: Buffer): any {
        const value = localStorage.getItem(this.syncInfoKey(blockchainId, accountId));
        return (value && JSON.parse(value)) || {}
    }

    saveSyncInfo(blockchainId: Buffer, accountId: Buffer, syncInfo: any) {
        localStorage.setItem(this.syncInfoKey(blockchainId, accountId), JSON.stringify(syncInfo));
    }

    private getEntriesFor(blockchainId: Buffer, accountId: Buffer): PaymentHistoryEntry[] {
        let entries = this.entriesCache[this.paymentHistoryKey(blockchainId, accountId)];

        if (!entries) {
            entries = this.loadFromStore(blockchainId, accountId);
            this.entriesCache[this.paymentHistoryKey(blockchainId, accountId)] = entries;
        }

        return entries;
    }

    private paymentHistoryKey(blockchainId: Buffer, accountId: Buffer): string {
        return `FT3_LIB_P_H_${
            accountId.toString('hex').toUpperCase()
        }_${
            blockchainId ? blockchainId.toString('hex').toUpperCase() : ""
        }`;
    }

    private syncInfoKey(blockchainId: Buffer, accountId: Buffer): string {
        return `FT3_LIB_P_H_S_I_${
            accountId.toString('hex').toUpperCase()
        }_${
            blockchainId ? blockchainId.toString('hex').toUpperCase() : ""
        }`;
    }

    private loadFromStore(blockchainId: Buffer, accountId: Buffer): PaymentHistoryEntry[] {
        const value = localStorage.getItem(this.paymentHistoryKey(blockchainId, accountId));
        const entries = value ? JSON.parse(value) : [];
        return entries.map(this.mapToPaymentHistoryEntry);
    }

    private saveToStore(blockchainId: Buffer, accountId: Buffer, entries: PaymentHistoryEntry[]) {
        localStorage.setItem(
            this.paymentHistoryKey(blockchainId, accountId),
            JSON.stringify(entries.map(entry => entry.adaptForSerialization()))
        )
    }

    private mapToPaymentHistoryEntry(entry: any): PaymentHistoryEntry {
        return new PaymentHistoryEntry(
            entry.isInput,
            entry.delta,
            entry.asset,
            Buffer.from(entry.assetId, 'hex'),
            entry.other,
            new Date(entry.timestamp),
            Buffer.from(entry.transactionId, 'hex'),
            entry.blockHeight
        );
    }

    deletePaymentHistory(accountId: Buffer, blockchainId: Buffer = null) {
        const syncInfoKey = this.syncInfoKey(blockchainId, accountId);
        const paymentHistoryKey = this.paymentHistoryKey(blockchainId, accountId);

        for (const key of Object.keys(this.entriesCache)) {
            if (this.entriesCache.hasOwnProperty(key) && key.startsWith(paymentHistoryKey)) {
                delete this.entriesCache[key];
            }
        }

        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(paymentHistoryKey) || key.startsWith(syncInfoKey) ) {
                localStorage.removeItem(key);
            }
        }
    }
}

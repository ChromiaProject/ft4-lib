import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryIterator from "./payment-history-iterator";


export default class PaymentHistoryStoreMemory implements PaymentHistoryStore {
    private entriesCache: {[key: string]: PaymentHistoryEntry[]} = {};
    private syncInfo: {[key: string]: any} = {};

    get(blockchainId: Buffer, accountId: Buffer, start: number, pageSize: number): PaymentHistoryEntry[] {
        const entries = this.entriesCache[this.paymentHistoryKey(blockchainId, accountId)];
        if (entries.length < start) { return [] }
        return entries.slice(start, Math.min(entries.length, start + pageSize));
    }

    getCount(blockchainId: Buffer, accountId: Buffer): number {
        return (this.entriesCache[this.paymentHistoryKey(blockchainId, accountId)] || []).length;
    }

    getIterator(blockchainId: Buffer, accountId: Buffer, pageSize: number): PaymentHistoryIterator {
        return new PaymentHistoryIterator(this, blockchainId, accountId, pageSize);
    }

    getSyncInfo(blockchainId: Buffer, accountId: Buffer): any {
        return this.syncInfo[this.syncInfoKey(blockchainId, accountId)] || {};
    }

    save(blockchainId: Buffer, accountId: Buffer, paymentHistoryEntries: PaymentHistoryEntry[]) {
        const entries = this.entriesCache[this.paymentHistoryKey(blockchainId, accountId)] || [];
        this.entriesCache[this.paymentHistoryKey(blockchainId, accountId)] = paymentHistoryEntries.concat(entries);
    }

    saveSyncInfo(blockchainId: Buffer, accountId: Buffer, syncInfo: any) {
        this.syncInfo[this.syncInfoKey(blockchainId, accountId)] = syncInfo;
    }

    deletePaymentHistory(accountId: Buffer, blockchainId: Buffer) {
        const key = this.syncInfoKey(blockchainId, accountId);
        if (this.entriesCache[key]) {
            delete this.entriesCache[key];
        }
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
}
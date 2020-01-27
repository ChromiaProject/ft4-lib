import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryIterator from "./payment-history-iterator";


export default class PaymentHistoryStoreNullObject implements PaymentHistoryStore {
    get(accountId: Buffer, start: number, pageSize: number): PaymentHistoryEntry[] {
        return [];
    }

    getCount(accountId: Buffer): number {
        return 0;
    }

    getIterator(accountId: Buffer, pageSize: number): PaymentHistoryIterator {
        return new PaymentHistoryIterator(this, accountId, pageSize);
    }

    getSyncInfo(accountId: Buffer): any {
        return {};
    }

    save(accountId: Buffer, paymentHistoryEntries: PaymentHistoryEntry[]) {
    }

    saveSyncInfo(accountId: Buffer, syncInfo: any) {
    }

    deletePaymentHistory(accountId: Buffer) {
    }
}
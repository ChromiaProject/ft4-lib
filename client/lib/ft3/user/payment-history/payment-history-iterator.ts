import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryStore from "./payment-history-store";

export default class PaymentHistoryIterator {
    readonly blockchainId: Buffer;
    readonly accountId: Buffer;
    readonly pageSize: number;
    private currentPage: number = -1;
    private paymentHistoryStore: PaymentHistoryStore;

    constructor(paymentHistoryStore: PaymentHistoryStore, blockchainId: Buffer, accountId: Buffer, pageSize: number) {
        this.paymentHistoryStore = paymentHistoryStore;
        this.blockchainId = blockchainId;
        this.accountId = accountId;
        this.pageSize = pageSize;
    }

    get pageCount(): number {
        return Math.ceil(this.paymentHistoryStore.getCount(this.blockchainId, this.accountId) / this.pageSize);
    }

    get totalCount(): number {
        return this.paymentHistoryStore.getCount(this.blockchainId, this.accountId)
    }

    get current(): number {
        return this.pageCount ? this.currentPage : 0;
    }

    rewind(): PaymentHistoryEntry[] {
        const entries = this.paymentHistoryStore.get(this.blockchainId, this.accountId, 0, this.pageSize);
        this.currentPage = 0;
        return entries;
    }

    prev(): PaymentHistoryEntry[] {
        if (this.currentPage === 0) { return [] }
        const page = this.currentPage - 1;
        const entries = this.paymentHistoryStore.get(this.blockchainId, this.accountId, page * this.pageSize, this.pageSize);
        this.currentPage = page;
        return entries;
    }

    next(): PaymentHistoryEntry[] {
        if (!this.hasMore()) { return [] }
        const page = this.currentPage + 1;
        const entries = this.paymentHistoryStore.get(this.blockchainId, this.accountId, page * this.pageSize, this.pageSize);
        this.currentPage = page;
        return entries;
    }

    fastForward(): PaymentHistoryEntry[] {
        const page = this.pageCount - 1;
        const entries = this.paymentHistoryStore.get(this.blockchainId, this.accountId, page * this.pageSize, this.pageSize);
        this.currentPage = page;
        return entries;
    }

    hasMore(): boolean {
        return this.currentPage < this.pageCount - 1;
    }
}

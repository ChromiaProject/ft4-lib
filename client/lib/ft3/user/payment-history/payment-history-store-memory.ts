import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryIterator from "./payment-history-iterator";

export default class PaymentHistoryStoreMemory implements PaymentHistoryStore {
  private entriesCache: { [key: string]: PaymentHistoryEntry[] } = {};
  private syncInfo: { [key: string]: any } = {};

  get(
    brid: Buffer,
    accountId: Buffer,
    start: number,
    pageSize: number
  ): PaymentHistoryEntry[] {
    const entries = this.entriesCache[this.paymentHistoryKey(brid, accountId)];
    if (entries.length < start) {
      return [];
    }
    return entries.slice(start, Math.min(entries.length, start + pageSize));
  }

  getCount(brid: Buffer, accountId: Buffer): number {
    return (this.entriesCache[this.paymentHistoryKey(brid, accountId)] || [])
      .length;
  }

  getIterator(
    brid: Buffer,
    accountId: Buffer,
    pageSize: number
  ): PaymentHistoryIterator {
    return new PaymentHistoryIterator(this, brid, accountId, pageSize);
  }

  getSyncInfo(brid: Buffer, accountId: Buffer): any {
    return this.syncInfo[this.syncInfoKey(brid, accountId)] || {};
  }

  save(
    brid: Buffer,
    accountId: Buffer,
    paymentHistoryEntries: PaymentHistoryEntry[]
  ) {
    const entries =
      this.entriesCache[this.paymentHistoryKey(brid, accountId)] || [];
    this.entriesCache[this.paymentHistoryKey(brid, accountId)] =
      paymentHistoryEntries.concat(entries);
  }

  saveSyncInfo(brid: Buffer, accountId: Buffer, syncInfo: any) {
    this.syncInfo[this.syncInfoKey(brid, accountId)] = syncInfo;
  }

  deletePaymentHistory(accountId: Buffer, brid: Buffer) {
    const key = this.syncInfoKey(brid, accountId);
    if (this.entriesCache[key]) {
      delete this.entriesCache[key];
    }
  }

  private paymentHistoryKey(brid: Buffer, accountId: Buffer): string {
    return `FT3_LIB_P_H_${accountId.toString("hex").toUpperCase()}_${
      brid ? brid.toString("hex").toUpperCase() : ""
    }`;
  }

  private syncInfoKey(brid: Buffer, accountId: Buffer): string {
    return `FT3_LIB_P_H_S_I_${accountId.toString("hex").toUpperCase()}_${
      brid ? brid.toString("hex").toUpperCase() : ""
    }`;
  }
}

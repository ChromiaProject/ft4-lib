import PaymentHistoryStore from "./payment-history-store";
import PaymentHistoryIterator from "./payment-history-iterator";
import PaymentHistoryEntry from "./payment-history-entry";

export default class PaymentHistoryStoreLocalStorage
  implements PaymentHistoryStore
{
  private entriesCache: { [key: string]: PaymentHistoryEntry[] } = {};

  getCount(brid: Buffer, accountId: Buffer): number {
    return this.getEntriesFor(brid, accountId).length;
  }

  getIterator(
    brid: Buffer,
    accountId: Buffer,
    pageSize: number
  ): PaymentHistoryIterator {
    return new PaymentHistoryIterator(this, brid, accountId, pageSize);
  }

  save(
    brid: Buffer,
    accountId: Buffer,
    paymentHistoryEntries: PaymentHistoryEntry[]
  ) {
    const entries = this.loadFromStore(brid, accountId);
    const newEntries = paymentHistoryEntries.concat(entries);
    this.saveToStore(brid, accountId, newEntries);
    this.entriesCache[this.paymentHistoryKey(brid, accountId)] = newEntries;
  }

  get(
    brid: Buffer,
    accounId: Buffer,
    start: number,
    pageSize: number
  ): PaymentHistoryEntry[] {
    const entries = this.getEntriesFor(brid, accounId);
    if (entries.length < start) {
      return [];
    }
    return entries.slice(start, Math.min(entries.length, start + pageSize));
  }

  getSyncInfo(brid: Buffer, accountId: Buffer): any {
    const value = localStorage.getItem(this.syncInfoKey(brid, accountId));
    return (value && JSON.parse(value)) || {};
  }

  saveSyncInfo(brid: Buffer, accountId: Buffer, syncInfo: any) {
    localStorage.setItem(
      this.syncInfoKey(brid, accountId),
      JSON.stringify(syncInfo)
    );
  }

  private getEntriesFor(
    brid: Buffer,
    accountId: Buffer
  ): PaymentHistoryEntry[] {
    let entries = this.entriesCache[this.paymentHistoryKey(brid, accountId)];

    if (!entries) {
      entries = this.loadFromStore(brid, accountId);
      this.entriesCache[this.paymentHistoryKey(brid, accountId)] = entries;
    }

    return entries;
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

  private loadFromStore(
    brid: Buffer,
    accountId: Buffer
  ): PaymentHistoryEntry[] {
    const value = localStorage.getItem(this.paymentHistoryKey(brid, accountId));
    const entries = value ? JSON.parse(value) : [];
    return entries.map(this.mapToPaymentHistoryEntry);
  }

  private saveToStore(
    brid: Buffer,
    accountId: Buffer,
    entries: PaymentHistoryEntry[]
  ) {
    localStorage.setItem(
      this.paymentHistoryKey(brid, accountId),
      JSON.stringify(entries.map((entry) => entry.adaptForSerialization()))
    );
  }

  private mapToPaymentHistoryEntry(entry: any): PaymentHistoryEntry {
    return new PaymentHistoryEntry(
      entry.isInput,
      entry.delta,
      entry.asset,
      Buffer.from(entry.assetId, "hex"),
      entry.other,
      new Date(entry.timestamp),
      Buffer.from(entry.transactionId, "hex"),
      entry.blockHeight
    );
  }

  deletePaymentHistory(accountId: Buffer, brid: Buffer = null) {
    const syncInfoKey = this.syncInfoKey(brid, accountId);
    const paymentHistoryKey = this.paymentHistoryKey(brid, accountId);

    for (const key of Object.keys(this.entriesCache)) {
      if (
        Object.prototype.hasOwnProperty.call(this.entriesCache, key) &&
        key.startsWith(paymentHistoryKey)
      ) {
        delete this.entriesCache[key];
      }
    }

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(paymentHistoryKey) || key.startsWith(syncInfoKey)) {
        localStorage.removeItem(key);
      }
    }
  }
}

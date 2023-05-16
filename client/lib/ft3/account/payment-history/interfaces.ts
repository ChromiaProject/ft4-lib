import {
  PaymentHistoryCursor,
  PaymentHistoryEntry,
  PaymentHistoryFilter,
  TransferHistoryResponse,
} from "./types";

export interface PaymentHistoryStore {
  accountId: Buffer;
  setPageSize(size: number): void;
  getPageSize(): number;
  getPageCount(): number;
  getEntryCount(): number;
  loadAllNewTx(): Promise<PaymentHistoryStore | null>; //returns new updated one
  isUpToDate(): Promise<boolean>;
  get(page: number): Promise<readonly PaymentHistoryEntry[]>;
  deletePaymentHistory(): void;
}

export interface PaymentHistoryRetriever {
  getTotalCount: () => Promise<number>;
  retrieve: (
    amount: number,
    filter: PaymentHistoryFilter | null,
    cursor: PaymentHistoryCursor | null
  ) => Promise<TransferHistoryResponse>;
  brid: string;
}

export interface PaymentHistoryIterator {
  getStorage: () => PaymentHistoryStore;
  getCurrentPage: () => number;
  sync: () => Promise<void>;
  reload: () => Promise<readonly PaymentHistoryEntry[]>;
  changePageSize: (size: number) => Promise<readonly PaymentHistoryEntry[]>;
  rewind: () => Promise<readonly PaymentHistoryEntry[]>;
  prev: () => Promise<readonly PaymentHistoryEntry[]>;
  jumpTo: (page: number) => Promise<readonly PaymentHistoryEntry[]>;
  next: () => Promise<readonly PaymentHistoryEntry[]>;
  fastForward: () => Promise<readonly PaymentHistoryEntry[]>;
  hasMore: () => boolean;
}

export class PaymentHistoryError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "PaymentHistoryError";
  }
}

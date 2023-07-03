import {
  PaymentHistoryEntry,
  PaymentHistoryFilter,
  TransferHistoryResponse,
} from "./types";
import { PageCursor } from "../../types";

export interface PaymentHistoryRetriever {
  getTotalCount: () => Promise<number>;
  retrieve: (
    amount: number,
    filter: PaymentHistoryFilter | null,
    cursor: PageCursor | null
  ) => Promise<TransferHistoryResponse>;
  retrieveSingle: (rowid: number) => Promise<PaymentHistoryEntry | null>;
  brid: string;
}

export class PaymentHistoryError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "PaymentHistoryError";
  }
}

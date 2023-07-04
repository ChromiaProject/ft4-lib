import {
  TransferHistoryEntry,
  TransferHistoryFilter,
  TransferHistoryResponse,
} from "./types";
import { PageCursor } from "../../types";

export interface TransferHistoryRetriever {
  getTotalCount: () => Promise<number>;
  retrieve: (
    amount: number,
    filter: TransferHistoryFilter | null,
    cursor: PageCursor | null
  ) => Promise<TransferHistoryResponse>;
  retrieveSingle: (rowid: number) => Promise<TransferHistoryEntry | null>;
  brid: string;
}

export class TransferHistoryError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "TransferHistoryError";
  }
}

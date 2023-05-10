import { PaymentHistoryEntry, PaymentHistoryType } from "./types";
import { BufferId } from "../../../cryptoUtils";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { formatter } from "postchain-client";
import { createPaymentHistoryEntryFromResponse } from "./payment-history-entry";
import { PaymentHistoryError, PaymentHistoryRetriever } from "./interfaces";

export function createPaymentHistoryRetriever(
  session: GtxClient,
  accountId: BufferId
): PaymentHistoryRetriever {
  const id = formatter.ensureBuffer(accountId);

  return Object.freeze({
    getTotalCount: async (): Promise<number> => {
      return await session.query("ft3.get_payment_history_size", {
        account_id: id,
      });
    },
    retrieve: async (
      amount: number,
      type: PaymentHistoryType | null,
      lastElementRowid = 0
    ): Promise<[PaymentHistoryEntry[], number?]> => {
      if (amount > 100)
        throw new PaymentHistoryError("amount needs to be <= 100");
      const res = await session.query("ft3.get_payment_history_paginated", {
        filter: [id, type],
        page_size: amount,
        before_rowid: lastElementRowid,
      });
      return [
        res.data.map((d) => createPaymentHistoryEntryFromResponse(d)),
        res.next_cursor || null,
      ];
    },
    brid: session.newTransaction([]).gtx.blockchainRID.toString("hex"),
  });
}

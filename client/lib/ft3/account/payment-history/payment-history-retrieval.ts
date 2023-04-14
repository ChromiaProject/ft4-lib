import { PaymentHistoryCursor, PaymentHistoryEntry } from "./types";
import { BufferId } from "../../../cryptoUtils";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { formatter, gtv } from "postchain-client";
import { createPaymentHistoryEntryFromResponse } from "./payment-history-entry";
import { PaymentHistoryRetriever } from "./interfaces";

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
      lastElementRowid: string | null = null
    ): Promise<[PaymentHistoryEntry[], PaymentHistoryCursor]> => {
      if (amount > 100) throw new Error("amount needs to be <= 100");
      const cursor = gtv.encode([amount, lastElementRowid]).toString("base64");
      const res = await session.query("ft3.get_payment_history_paginated", {
        account_id: id,
        page_cursor: cursor,
      });
      return [
        res.data.map((d) => createPaymentHistoryEntryFromResponse(d)),
        res.next_cursor
          ? <PaymentHistoryCursor>(
              gtv.decode(Buffer.from(res.next_cursor, "base64"))
            )
          : [null, null],
      ];
    },
    brid: session.newTransaction([]).gtx.blockchainRID.toString("hex"),
  });
}

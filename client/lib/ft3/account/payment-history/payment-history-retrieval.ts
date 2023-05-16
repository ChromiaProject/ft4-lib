import { PaymentHistoryFilter, TransferHistoryResponse } from "./types";
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
      filter: PaymentHistoryFilter | null,
      cursor: string | null = null
    ): Promise<TransferHistoryResponse> => {
      if (amount > 100)
        throw new PaymentHistoryError("amount needs to be <= 100");

      const res = await session.query("ft3.get_payment_history_paginated", {
        account_id: id,
        filter: [filter?.paymentHistoryType],
        page_size: amount,
        page_cursor: cursor,
      });
      return {
        data: res.data.map((d) => createPaymentHistoryEntryFromResponse(d)),
        nextCursor: res.next_cursor,
      };
    },
    brid: session.newTransaction([]).gtx.blockchainRID.toString("hex"),
  });
}

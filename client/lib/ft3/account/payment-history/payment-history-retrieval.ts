import {
  PaymentHistoryEntryResponse,
  PaymentHistoryFilter,
  PaymentHistoryType,
  TransferHistoryResponse,
} from "./types";
import { BufferId } from "../../../cryptoUtils";
import { formatter } from "postchain-client";
import { createPaymentHistoryEntryFromResponse } from "./payment-history-entry";
import { PaymentHistoryError, PaymentHistoryRetriever } from "./interfaces";
import { IClient } from "postchain-client/built/src/blockchainClient/interface";

export function createPaymentHistoryRetriever(
  session: IClient,
  accountId: BufferId
): PaymentHistoryRetriever {
  const id = formatter.ensureBuffer(accountId);

  return Object.freeze({
    getTotalCount: async (): Promise<number> => {
      return await session.query("ft4.get_payment_history_size", {
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

      const res = await session.query<
        QueryType,
        {
          data: PaymentHistoryEntryResponse[];
          next_cursor: string;
        }
      >("ft4.get_transfer_history", {
        account_id: id,
        filter: [filter?.paymentHistoryType],
        page_size: amount,
        page_cursor: cursor,
      });
      return {
        data: res.data.map(createPaymentHistoryEntryFromResponse),
        nextCursor: res.next_cursor,
      };
    },
    retrieveSingle: async (rowid: number) => {
      return createPaymentHistoryEntryFromResponse(
        await session.query("ft4.get_transfer_history_entry", { rowid })
      );
    },
    brid: session.config.blockchainRID.toString("hex"),
  });
}

type QueryType = {
  account_id: Buffer;
  filter: PaymentHistoryType[] | undefined;
  page_size: number;
  page_cursor: string;
};

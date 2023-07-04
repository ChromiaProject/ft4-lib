import {
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
  TransferHistoryType,
  TransferHistoryResponse,
} from "./types";
import { BufferId } from "../../../cryptoUtils";
import { IClient, formatter } from "postchain-client";
import { createTransferHistoryEntryFromResponse } from "./transfer-history-entry";
import { TransferHistoryError, TransferHistoryRetriever } from "./interfaces";
import { Buffer } from "buffer";
import { PagedResponse } from "/ft4/types";

export function createTransferHistoryRetriever(
  session: IClient,
  accountId: BufferId
): TransferHistoryRetriever {
  const id = formatter.ensureBuffer(accountId);

  return Object.freeze({
    getTotalCount: async (): Promise<number> => {
      return await session.query("ft4.get_transfer_history_size", {
        account_id: id,
      });
    },
    retrieve: async (
      amount: number,
      filter: TransferHistoryFilter | null,
      cursor: string | null = null
    ): Promise<TransferHistoryResponse> => {
      if (amount > 100)
        throw new TransferHistoryError("amount needs to be <= 100");

      const res = await session.query<
        QueryType,
        PagedResponse<TransferHistoryEntryResponse>
      >("ft4.get_transfer_history", {
        account_id: id,
        filter: [filter?.transferHistoryType],
        page_size: amount,
        page_cursor: cursor,
      });
      return {
        data: res.data.map(createTransferHistoryEntryFromResponse),
        nextCursor: res.next_cursor,
      };
    },
    retrieveSingle: async (rowid: number) => {
      return createTransferHistoryEntryFromResponse(
        await session.query("ft4.get_transfer_history_entry", { rowid })
      );
    },
    brid: session.config.blockchainRID,
  });
}

type QueryType = {
  account_id: Buffer;
  filter: TransferHistoryType[] | undefined;
  page_size: number;
  page_cursor: string;
};

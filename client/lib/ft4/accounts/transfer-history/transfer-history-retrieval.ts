import { IClient, formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { TransferHistoryError, TransferHistoryRetriever } from "./interfaces";
import { createTransferHistoryEntryFromResponse } from "./transfer-history-entry";
import {
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
  TransferHistoryResponse,
} from "./types";
import { OptionalPageCursor, PagedResponse } from "/ft4/types";

export function createTransferHistoryRetriever(
  session: IClient,
  accountId: BufferId,
): TransferHistoryRetriever {
  const id = formatter.ensureBuffer(accountId);

  return Object.freeze({
    retrieve: async (
      amount: number,
      filter: TransferHistoryFilter | null,
      cursor: OptionalPageCursor = null,
    ): Promise<TransferHistoryResponse> => {
      if (amount > 100)
        throw new TransferHistoryError("amount needs to be <= 100");

      const res = await session.query<
        PagedResponse<TransferHistoryEntryResponse>
      >("ft4.get_transfer_history", {
        account_id: id,
        filter: [filter?.transferHistoryType ?? null],
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
        await session.query("ft4.get_transfer_history_entry", { rowid }),
      );
    },
    brid: session.config.blockchainRid,
  });
}

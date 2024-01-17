import { BufferId } from "@ft4/utils/types";
import {
  transferDetails,
  transferDetailsByAsset,
  RawTransferDetail,
  transferHistoryFromHeight,
} from "@ft4/accounts/transfer-history/transfer-history-queries";
import { Queryable } from "postchain-client";
import { OptionalPageCursor } from "@ft4/types";
import { retrievePaginatedEntity } from "@ft4/utils";
import {
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
} from "@ft4/accounts";
import { createTransferHistoryEntryFromResponse } from "@ft4/accounts/transfer-history/transfer-history-entry";

export type TransferDetail = {
  accountId: Buffer;
  assetId: Buffer;
  delta: bigint;
  isInput: boolean;
};

export function getTransferDetails(
  connection: Queryable,
  txRid: BufferId,
  opIndex: number,
): Promise<TransferDetail[]> {
  return connection
    .query(transferDetails(txRid, opIndex))
    .then((tds) => tds.map(createTransferDetail));
}

export function getTransferDetailsByAsset(
  connection: Queryable,
  txRid: BufferId,
  opIndex: number,
  assetId: BufferId,
): Promise<TransferDetail[]> {
  return connection
    .query(transferDetailsByAsset(txRid, opIndex, assetId))
    .then((tds) => tds.map(createTransferDetail));
}

function createTransferDetail(td: RawTransferDetail) {
  return Object.freeze({
    accountId: td.account_id,
    assetId: td.asset_id,
    delta: td.delta,
    isInput: td.is_input !== 0,
  });
}

export function getTransferHistoryFromHeight(
  connection: Queryable,
  height: number,
  assetId: BufferId | null,
  limit: number,
  cursor: OptionalPageCursor = null,
) {
  return retrievePaginatedEntity<
    TransferHistoryEntry,
    TransferHistoryEntryResponse
  >(
    connection,
    transferHistoryFromHeight(height, assetId, limit, cursor),
    (entries) =>
      entries.map((entry) => createTransferHistoryEntryFromResponse(entry)),
  );
}

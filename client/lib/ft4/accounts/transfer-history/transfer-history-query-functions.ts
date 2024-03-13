import {
  transferDetails,
  transferDetailsByAsset,
  RawTransferDetail,
  transferHistoryFromHeight,
} from "./transfer-history-queries";
import { Queryable } from "postchain-client";
import { OptionalPageCursor } from "@ft4/types";
import { retrievePaginatedEntity, BufferId } from "@ft4/utils";
import {
  TransferDetail,
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
} from "@ft4/accounts";
import { createTransferHistoryEntryFromResponse } from "./transfer-history-entry";

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
    blockchainRid: td.blockchain_rid,
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

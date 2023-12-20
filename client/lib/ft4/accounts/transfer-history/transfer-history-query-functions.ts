import { BufferId } from "@ft4/utils/types";
import {
  transferDetails,
  transferDetailsByAsset,
  RawTransferDetail,
} from "@ft4/accounts/transfer-history/transfer-history-queries";
import { Queryable } from "postchain-client";

export type TransferDetail = {
  account_id: Buffer;
  asset_id: Buffer;
  delta: bigint;
  is_input: boolean;
  entry_index: number;
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
    account_id: td.account_id,
    asset_id: td.asset_id,
    delta: td.delta,
    is_input: td.is_input !== 0,
    entry_index: td.entry_index,
  });
}

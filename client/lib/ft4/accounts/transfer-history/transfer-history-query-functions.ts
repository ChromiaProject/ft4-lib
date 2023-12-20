import { BufferId } from "@ft4/utils/types";
import {
  transferDetails,
  transferDetailsByAsset,
  RawTransferDetail,
} from "@ft4/accounts/transfer-history/transfer-history-queries";
import { Queryable } from "postchain-client";

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

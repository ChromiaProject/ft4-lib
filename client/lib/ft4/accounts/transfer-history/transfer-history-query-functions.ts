import { BufferId } from "@ft4/utils/types";
import { Connection } from "@ft4/types";
import { getTransferDetailsQueryObject } from "@ft4/accounts/transfer-history/transfer-history-queries";
import { formatter } from "postchain-client";
import { getTransferDetailsByAssetQueryObject } from "@ft4/accounts/transfer-history/transfer-history-queries";
import { RawTransferDetail } from "@ft4/accounts/transfer-history/transfer-history-queries";

export type TransferDetail = {
  account_id: Buffer;
  asset_id: Buffer;
  delta: bigint;
  is_input: boolean;
  entry_index: number;
};

export function getTransferDetails(
  connection: Connection,
  txRid: BufferId,
  opIndex: number,
): Promise<TransferDetail[]> {
  return connection
    .query(
      getTransferDetailsQueryObject(formatter.ensureBuffer(txRid), opIndex),
    )
    .then((tds) => tds.map(createTransferDetail));
}

export function getTransferDetailsByAsset(
  connection: Connection,
  txRid: BufferId,
  opIndex: number,
  assetId: BufferId,
): Promise<TransferDetail[]> {
  return connection
    .query(
      getTransferDetailsByAssetQueryObject(
        formatter.ensureBuffer(txRid),
        opIndex,
        formatter.ensureBuffer(assetId),
      ),
    )
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

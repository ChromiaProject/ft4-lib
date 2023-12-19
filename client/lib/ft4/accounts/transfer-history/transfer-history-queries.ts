import { QueryObject } from "postchain-client";

export type RawTransferDetail = {
  account_id: Buffer;
  asset_id: Buffer;
  delta: bigint;
  is_input: number;
  entry_index: number;
};

export function getTransferDetailsQueryObject(
  txRid: Buffer,
  opIndex: number,
): QueryObject<RawTransferDetail[]> {
  return {
    name: "ft4.get_transfer_details",
    args: { tx_rid: txRid, op_index: opIndex },
  };
}

export function getTransferDetailsByAssetQueryObject(
  txRid: Buffer,
  opIndex: number,
  assetId: Buffer,
): QueryObject<RawTransferDetail[]> {
  return {
    name: "ft4.get_transfer_details_by_asset",
    args: { tx_rid: txRid, op_index: opIndex, asset_id: assetId },
  };
}

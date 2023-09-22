import { QueryObject, formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { Buffer } from "buffer";

export function assetOriginById(
  assetId: BufferId,
): QueryObject<{ asset_id: Buffer }> {
  return {
    name: "ft4.crosschain.get_asset_origin_by_id",
    args: {
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

export function pendingTransfersForAccount(
  accountId: BufferId,
): QueryObject<{ account_id: Buffer }> {
  return {
    name: "ft4.crosschain.get_pending_transfers_for_account",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

export function isTransferApplied(
  txRid: Buffer,
  opIndex: number,
): QueryObject<{ tx_rid: Buffer; op_index: number }> {
  return {
    name: "ft4.crosschain.is_transfer_applied",
    args: {
      tx_rid: txRid,
      op_index: opIndex,
    },
  };
}

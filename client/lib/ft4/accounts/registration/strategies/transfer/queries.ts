import { QueryObject } from "postchain-client";

export function allowedAssets(): QueryObject<
  { asset_id: Buffer; min_amount: bigint }[]
> {
  return {
    name: "ft4.get_allowed_assets",
    args: {},
  };
}

export function pendingTransferStrategies(
  recipientId: Buffer,
): QueryObject<string[] | null, { recipient_id: Buffer }> {
  return {
    name: "ft4.get_pending_transfer_strategies",
    args: {
      recipient_id: recipientId,
    },
  };
}

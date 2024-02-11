import { QueryObject } from "postchain-client";

export function allowedAssets(): QueryObject<{ [key: string]: bigint }> { // TODO key is actually byte_array in Rell/GTV, how will that end up here?
  return {
    name: "ft4.get_allowed_assets",
    args: {},
  };
}

export function pendingTransferStrategies(
  recipientId: Buffer,
): QueryObject<string[], { recipient_id: Buffer }> {
  return {
    name: "ft4.get_pending_transfer_strategies",
    args: {
      recipient_id: recipientId,
    },
  };
}

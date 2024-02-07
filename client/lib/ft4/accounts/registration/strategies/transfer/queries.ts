import { QueryObject } from "postchain-client";

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

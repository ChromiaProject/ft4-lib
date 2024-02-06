import { QueryObject } from "postchain-client";

export function getPendingTransferStrategies(
  recipientId: Buffer,
): QueryObject<string, { recipient_id: Buffer }> {
  return {
    name: "ft4.get_pending_transfer_strategies",
    args: {
      recipient_id: recipientId,
    },
  };
}

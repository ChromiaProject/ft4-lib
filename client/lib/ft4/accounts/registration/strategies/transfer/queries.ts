import { QueryObject } from "postchain-client";

export function allowedAssets(
  senderBlockchainRid: Buffer,
  senderId: Buffer,
  recipientId: Buffer,
): QueryObject<
  { asset_id: Buffer; min_amount: bigint }[] | null,
  {
    sender_blockchain_rid: Buffer;
    sender_id: Buffer;
    recipient_id: Buffer;
  }
> {
  return {
    name: "ft4.get_allowed_assets",
    args: {
      sender_blockchain_rid: senderBlockchainRid,
      sender_id: senderId,
      recipient_id: recipientId,
    },
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

import { BufferId } from "@ft4/utils";
import { Buffer } from "buffer";
import { QueryObject, formatter } from "postchain-client";
import { TransferStrategyRuleRaw } from "./types";

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

export function subscriptionAssets(): QueryObject<
  { asset_id: Buffer; amount: bigint }[]
> {
  return {
    name: "ft4.get_subscription_assets",
    args: {},
  };
}

export function subscriptionDetails(
  accountId: BufferId,
): QueryObject<
  { asset_id: Buffer; period_millis: number; last_payment: number },
  { account_id: Buffer }
> {
  return {
    name: "ft4.get_subscription_details",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

export function subscriptionPeriodMillis(): QueryObject<number> {
  return {
    name: "ft4.get_subscription_period_millis",
    args: {},
  };
}

export function feeAssets(): QueryObject<
  { asset_id: Buffer; amount: bigint }[]
> {
  return {
    name: "ft4.get_fee_assets",
    args: {},
  };
}

export function hasPendingCreateAccountTransferForStrategy(
  strategyName: string,
  senderBlockchainRid: BufferId,
  senderId: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: bigint,
): QueryObject<
  boolean,
  {
    strategy_name: string;
    sender_blockchain_rid: Buffer;
    sender_id: Buffer;
    recipient_id: Buffer;
    asset_id: Buffer;
    amount: bigint;
  }
> {
  return {
    name: "ft4.has_pending_create_account_transfer_for_strategy",
    args: {
      strategy_name: strategyName,
      sender_blockchain_rid: formatter.ensureBuffer(senderBlockchainRid),
      sender_id: formatter.ensureBuffer(senderId),
      recipient_id: formatter.ensureBuffer(recipientId),
      asset_id: formatter.ensureBuffer(assetId),
      amount,
    },
  };
}

export function enabledRegistrationStrategies(): QueryObject<string[]> {
  return {
    name: "ft4.get_enabled_registration_strategies",
    args: {},
  };
}

/**
 * Creates a query object for the `ft4.get_transfer_rules` query
 */
export function transferRules(): QueryObject<TransferStrategyRuleRaw[]> {
  return {
    name: "ft4.get_transfer_rules",
    args: {},
  };
}

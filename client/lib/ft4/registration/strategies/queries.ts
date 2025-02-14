import { Filter, BufferId } from "@ft4/utils";
import { Buffer } from "buffer";
import { QueryObject, formatter } from "postchain-client";
import { PendingTransferExpirationState } from "./types";
import { TransferStrategyRulePartialResponse } from "@ft4/registration/types";

/**
 * Creates a query object for the `get_allowed_assets` - query
 * @param senderBlockchainRid - the blockchain rid of the blockchain that will send the assets
 * @param senderId - the account id of the account from which the assets will be sent from
 * @param recipientId - the account id of the account that will receive the assets, i.e., the account that will be created.
 */
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

/**
 * Creates a query object for the `get_pending_transfer_strategies` - query
 * @param recipientId - the account id of the recipient of the transfer. I.e., the account that will be created
 * @param filter - optionally filter to only receive the transfer strategies which did not expire
 */
export function pendingTransferStrategies(
  recipientId: Buffer,
  filter?: Partial<Filter<{ state: PendingTransferExpirationState }>>,
): QueryObject<
  string[],
  {
    recipient_id: Buffer;
    filter?: Filter<{ state: PendingTransferExpirationState }>;
  }
> {
  return {
    name: "ft4.get_pending_transfer_strategies",
    args: {
      recipient_id: recipientId,
      filter: filter && { state: null, ...filter },
    },
  };
}

/**
 * Creates a query object for the `get_subscription_assets` - query
 */
export function subscriptionAssets(): QueryObject<
  { asset_id: Buffer; amount: bigint }[]
> {
  return {
    name: "ft4.get_subscription_assets",
    args: {},
  };
}

/**
 * Creates a query object for the `get_subscription_details` - query
 * @param accountId - the id of the account to fetch subscription details for
 */
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

/**
 * Creates a query object for the `get_subscription_period_millis` - query
 */
export function subscriptionPeriodMillis(): QueryObject<number> {
  return {
    name: "ft4.get_subscription_period_millis",
    args: {},
  };
}

/**
 * Creates a query object for the `get_fee_assets` - query
 */
export function feeAssets(): QueryObject<
  { asset_id: Buffer; amount: bigint }[]
> {
  return {
    name: "ft4.get_fee_assets",
    args: {},
  };
}

/**
 * Creates a query object for the `has_pending_create_account_transfer_for_strategy` - query
 * @param strategyName - the name of the strategy to check
 * @param senderBlockchainRid - the blockchain rid of the blockchain from which the pending transfer were sent
 * @param senderId - the id of the account from which the transfer originated
 * @param recipientId - the id of the account which the transfer is intended for
 * @param assetId - the id of the asset that was sent
 * @param amount - how much of the asset was sent
 */
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

/**
 * Creates a query object for the `get_enabled_registration_strategies` - query
 */
export function enabledRegistrationStrategies(): QueryObject<string[]> {
  return {
    name: "ft4.get_enabled_registration_strategies",
    args: {},
  };
}

/**
 * Creates a query object for the `ft4.get_transfer_rules` query
 */
export function transferRules(): QueryObject<
  TransferStrategyRulePartialResponse[]
> {
  return {
    name: "ft4.get_transfer_rules",
    args: {},
  };
}

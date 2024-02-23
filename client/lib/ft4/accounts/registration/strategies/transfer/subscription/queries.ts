import { Buffer } from "buffer";
import { QueryObject } from "postchain-client";
import { BufferId } from "@ft4/utils/index";
import { formatter } from "postchain-client";

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

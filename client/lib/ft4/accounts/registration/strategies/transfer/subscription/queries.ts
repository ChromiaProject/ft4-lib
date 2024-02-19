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

export function subscriptionLastPayment(
  accountId: BufferId,
): QueryObject<number, { account_id: Buffer }> {
  return {
    name: "ft4.get_subscription_last_payment",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

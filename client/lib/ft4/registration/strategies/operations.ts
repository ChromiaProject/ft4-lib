import { BufferId, Operation, formatter } from "postchain-client";
import { op } from "@ft4/utils";

/**
 * Creates a `renew_subscription` - operation object
 * @param assetId - the asset with which to pay the subscription
 */
export function renewSubscription(assetId: BufferId | null): Operation {
  return op(
    "ft4.renew_subscription",
    assetId ? formatter.ensureBuffer(assetId) : null,
  );
}

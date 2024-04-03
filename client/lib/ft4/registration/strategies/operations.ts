import { Operation, formatter } from "postchain-client";
import { op, BufferId } from "@ft4/utils";

export function renewSubscription(assetId: BufferId | null): Operation {
  return op(
    "ft4.renew_subscription",
    assetId ? formatter.ensureBuffer(assetId) : null,
  );
}

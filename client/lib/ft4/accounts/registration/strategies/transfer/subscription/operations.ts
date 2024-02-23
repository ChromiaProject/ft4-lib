import { Operation } from "postchain-client";
import { op } from "@ft4/utils/index";
import { BufferId } from "@ft4/utils/index";
import { formatter } from "postchain-client";

export function renewSubscription(assetId: BufferId | null): Operation {
  return op(
    "ft4.renew_subscription",
    assetId ? formatter.ensureBuffer(assetId) : null,
  );
}

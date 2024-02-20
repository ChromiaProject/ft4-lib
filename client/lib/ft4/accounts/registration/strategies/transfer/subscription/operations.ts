import { Operation } from "postchain-client";
import { op } from "@ft4/utils/index";

export function renewSubscription(): Operation {
  return op("ft4.renew_subscription");
}

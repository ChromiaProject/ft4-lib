import { op } from "../utils";
import { Operation, formatter } from "postchain-client";
import { authDescriptor as authDesc } from "../accounts/auth-descriptor";
import { AuthDescriptor } from "../accounts/auth-descriptor/types";
import { BufferId } from "/cryptoUtils";
import { Amount } from "../asset/interfaces";

export function registerAccount(authDescriptor: AuthDescriptor): Operation {
  const ad = authDesc.toGtv(authDescriptor);
  return op("ft4.admin.register_account", [ad[1], ad[2], ad[3]]);
}

export function addRateLimitPoints(
  accountId: BufferId,
  amount: number
): Operation {
  return op(
    "ft4.admin.add_rate_limit_points",
    formatter.ensureBuffer(accountId),
    amount
  );
}

export function registerAsset(
  name: string,
  symbol: string,
  decimals: number,
  iconUrl: string
): Operation {
  return op("ft4.admin.register_asset", name, symbol, decimals, iconUrl);
}

export function mint(
  accountId: BufferId,
  assetId: BufferId,
  amount: Amount
): Operation {
  return op(
    "ft4.admin.mint",
    formatter.ensureBuffer(accountId),
    formatter.ensureBuffer(assetId),
    amount.value
  );
}

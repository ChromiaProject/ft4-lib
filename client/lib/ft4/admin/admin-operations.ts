import { Operation, formatter } from "postchain-client";
import { gtv } from "../accounts/auth-descriptor";
import { Amount, Asset } from "@ft4/asset";
import { op } from "@ft4/utils/index";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts/auth-descriptor/types";
import { BufferId } from "@ft4/utils/types";

export function registerAccount(
  authDescriptor: AnyAuthDescriptorRegistration,
): Operation {
  return op(
    "ft4.admin.register_account",
    gtv.authDescriptorRegistrationToGtv(authDescriptor),
  );
}

export function addRateLimitPoints(
  accountId: BufferId,
  amount: number,
): Operation {
  return op(
    "ft4.admin.add_rate_limit_points",
    formatter.ensureBuffer(accountId),
    amount,
  );
}

export function registerAsset(
  name: string,
  symbol: string,
  decimals: number,
  iconUrl: string,
): Operation {
  return op("ft4.admin.register_asset", name, symbol, decimals, iconUrl);
}

export function mint(
  accountId: BufferId,
  assetId: BufferId,
  amount: Amount,
): Operation {
  return op(
    "ft4.admin.mint",
    formatter.ensureBuffer(accountId),
    formatter.ensureBuffer(assetId),
    amount.value,
  );
}

export function registerCrosschainAsset(
  asset: Asset,
  originBlockchainRid: BufferId,
): Operation {
  return op(
    "ft4.admin.register_crosschain_asset",
    asset.name,
    asset.symbol,
    asset.decimals,
    asset.blockchainRid,
    asset.iconUrl,
    formatter.ensureBuffer(originBlockchainRid),
  );
}

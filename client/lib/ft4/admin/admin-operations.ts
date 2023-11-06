import { op } from "../utils";
import { Operation, formatter } from "postchain-client";
import {
  GtvAuthDescriptorArgs,
  GtvAuthDescriptorRegistration,
} from "/ft4/accounts/auth-descriptor/types";
import { Amount } from "../asset/interfaces";
import { Asset } from "../asset/types";
import { BufferId } from "/ft4/utils/types";

export function registerAccount(
  authDescriptor: GtvAuthDescriptorRegistration<GtvAuthDescriptorArgs>,
): Operation {
  return op("ft4.admin.register_account", authDescriptor);
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
  originBrid: BufferId,
): Operation {
  return op(
    "ft4.admin.register_crosschain_asset",
    asset.name,
    asset.symbol,
    asset.decimals,
    asset.brid,
    asset.iconUrl,
    formatter.ensureBuffer(originBrid),
  );
}

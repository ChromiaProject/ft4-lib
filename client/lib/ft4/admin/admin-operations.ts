import { BufferId, Operation, formatter } from "postchain-client";
import { gtv, AnyAuthDescriptorRegistration } from "@ft4/accounts";
import { Amount, CrosschainAssetRegistration } from "@ft4/asset";
import { op } from "@ft4/utils";

/**
 * Creates an operation object for the `ft4.admin.register_account`-operation
 * @param authDescriptor - the auth descriptor data that will be the main auth descriptor of the account
 */
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
  asset: CrosschainAssetRegistration,
  originBlockchainRid: BufferId,
): Operation {
  return op(
    "ft4.admin.register_crosschain_asset",
    asset.id,
    asset.name,
    asset.symbol,
    asset.decimals,
    asset.blockchainRid,
    asset.iconUrl,
    asset.type,
    asset.uniquenessResolver,
    formatter.ensureBuffer(originBlockchainRid),
  );
}

import { op } from "../utils";
import { Operation } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { Buffer } from "buffer";

export function registerAssetOp(
  name: string,
  symbol: string,
  decimals: number,
  iconUrl: string
): Operation {
  return op("ft4.admin.register_asset", name, symbol, decimals, iconUrl);
}

export function mintOp(
  accountId: Buffer,
  assetId: Buffer,
  amount: Amount
): Operation {
  return op("ft4.admin.mint", accountId, assetId, amount.value);
}

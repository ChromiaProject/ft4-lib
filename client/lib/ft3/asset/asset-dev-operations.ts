import { op } from "../utils";
import { Operation } from "../utils/types";
import { AssetAmount } from "./types";

export function registerAssetOp(name: string): Operation {
  return op("ft3.dev_register_asset", name);
}

export function mintOp(
  assetId: Buffer,
  accountId: Buffer,
  amount: AssetAmount
): Operation {
  return op("ft3.dev_mint", Number(amount), assetId, accountId);
}

export function burnOp(
  assetId: Buffer,
  accountId: Buffer,
  amount: AssetAmount
): Operation {
  return op("ft3.dev_burn", Number(amount), assetId, accountId);
}

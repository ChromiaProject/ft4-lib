import { op } from "../utils";
import { Operation } from "../utils/types";
import { AssetAmount } from "./types";

export function registerAssetOp(name: string, brid: Buffer): Operation {
  return op("ft3.dev_register_asset", name, brid);
}

export function giveBalanceOp(
  assetId: Buffer,
  accountId: Buffer,
  amount: AssetAmount
): Operation {
  return op("ft3.dev_give_balance", assetId, accountId, amount);
}

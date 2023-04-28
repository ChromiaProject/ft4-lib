import { op } from "../utils";
import { Operation } from "../utils/types";
import { Amount } from "../asset/interfaces";

export function registerAssetOp(
  name: string,
  decimals: number,
  brid: Buffer
): Operation {
  return op("ft3.dev_register_asset", name, decimals, brid);
}

export function giveBalanceOp(
  assetId: Buffer,
  accountId: Buffer,
  amount: Amount
): Operation {
  return op("ft3.dev_give_balance", assetId, accountId, amount.value);
}

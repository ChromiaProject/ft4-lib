import { op } from "../utils";
import { Operation } from "../utils/types";
import { Amount } from "../asset/interfaces";

export function registerAssetOp(
  name: string,
  symbol: string,
  decimals: number,
  brid: Buffer,
  iconUrl: string
): Operation {
  return op("ft3.dev_register_asset", name, symbol, decimals, brid, iconUrl);
}

export function giveBalanceOp(
  assetId: Buffer,
  accountId: Buffer,
  amount: Amount
): Operation {
  return op("ft3.dev_give_balance", assetId, accountId, amount.value);
}

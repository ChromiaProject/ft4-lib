import { QueryObject } from "postchain-client";

export function feeAssets(): QueryObject<
  { asset_id: Buffer; amount: bigint }[]
> {
  return {
    name: "ft4.get_fee_assets",
    args: {},
  };
}

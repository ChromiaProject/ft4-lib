export type Asset = {
  id: Buffer;
  name: string;
  brid: Buffer;
};

export type Balance = {
  asset: Asset;
  amount: AssetAmount;
};

export type AssetAmount = bigint; /*{
    value: bigint;
    //decimals: number; To implement after PR is merged
} */

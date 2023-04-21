export type Asset = {
  id: Buffer;
  name: string;
  brid: Buffer;
  supply: number;
};

export type Balance = {
  asset: Asset;
  amount: AssetAmount;
};

export type AssetAmount = bigint; /*{
    value: bigint;
    //decimals: number; To implement after PR is merged
} */

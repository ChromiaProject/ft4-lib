import { Amount } from "./interfaces";

export type Asset = {
  id: Buffer;
  name: string;
  symbol: string;
  decimals: number;
  brid: Buffer;
  supply: bigint;
  icon_url: string;
};

export type Balance = {
  asset: Asset;
  amount: Amount;
};

export type BalanceResponse = {
  asset: Asset;
  amount: bigint;
};

export type BalanceResponseGtv = [
  asset: [
    assetId: Buffer,
    name: string,
    symbol: string,
    decimals: number,
    brid: Buffer,
    balance: bigint,
    icon_url: string
  ],
  amount: bigint,
  rowid: number
];

export enum DecimalFormat {
  scientific = "S",
  fixedDecimals = "F",
  mixed = "M",
}

export type SupportedNumber = string | number | bigint | Amount;

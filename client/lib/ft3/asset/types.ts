import { Amount } from "./interfaces";

export type Asset = {
  id: Buffer;
  name: string;
  decimals: number;
  brid: Buffer;
  supply: number;
};

export type Balance = {
  asset: Asset;
  amount: Amount;
};

export type BalanceResponse = {
  asset: Asset;
  amount: bigint;
};

export enum DecimalFormat {
  scientific = "S",
  fixedDecimals = "F",
  mixed = "M",
}

export type SupportedNumber = string | number | bigint | Amount;

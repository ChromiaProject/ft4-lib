import { Amount } from "./interfaces";
import { Buffer } from "buffer";

export type Asset = {
  id: Buffer;
  name: string;
  symbol: string;
  decimals: number;
  brid: Buffer;
  supply: bigint;
  iconUrl: string;
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

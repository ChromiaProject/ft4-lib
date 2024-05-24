import { RawGtv } from "postchain-client";
import { Buffer } from "buffer";

export const ASSET_TYPE_FT4 = "ft4";

export type Asset = {
  id: Buffer;
  name: string;
  symbol: string;
  decimals: number;
  blockchainRid: Buffer;
  iconUrl: string;
  type: string;
  supply: bigint;
};

export type AssetResponse = {
  id: Buffer;
  name: string;
  symbol: string;
  decimals: number;
  blockchain_rid: Buffer;
  icon_url: string;
  type: string;
  supply: bigint;
};

export type CrosschainAssetRegistration = {
  id: Buffer;
  name: string;
  symbol: string;
  decimals: number;
  blockchainRid: Buffer;
  iconUrl: string;
  type: string;
  uniquenessResolver: Buffer;
};

export type CrosschainAssetRegistrationResponse = {
  id: Buffer;
  name: string;
  symbol: string;
  decimals: number;
  blockchain_rid: Buffer;
  icon_url: string;
  type: string;
  uniqueness_resolver: Buffer;
};

export type RawAmount = { value: bigint; decimals: number };

export type Balance = {
  asset: Asset;
  amount: Amount;
};

export type BalanceResponse = {
  asset: AssetResponse;
  amount: bigint;
};

export enum DecimalFormat {
  scientific = "S",
  fixedDecimals = "F",
  mixed = "M",
}

export type SupportedNumber = string | number | Amount;

export type AnyAssetAmount = RawAmount | Amount;

export interface Amount {
  value: bigint;
  decimals: number;

  plus: (other: SupportedNumber) => Amount;

  minus: (other: SupportedNumber) => Amount;
  times: (other: string | number | bigint) => Amount;
  dividedBy: (other: string | number | bigint) => Amount;

  gt: (other: SupportedNumber) => boolean;
  gte: (other: SupportedNumber) => boolean;
  lt: (other: SupportedNumber) => boolean;
  lte: (other: SupportedNumber) => boolean;
  eq: (other: SupportedNumber) => boolean;

  equals: (other: SupportedNumber) => boolean;

  /**
   * Can be used as compareFn with `Array.sort()`.
   *
   * @param other - amount to compare with
   *
   * @returns 0 if other is equal to this
   *         1 if other should come before this when sorted
   *        -1 if other should come after this when sorted
   */
  compare: (other: SupportedNumber) => number;

  toString: () => string;
  format(
    which: DecimalFormat.scientific,
    digits: number,
    removeTrailingZeroes?: boolean,
  ): string;
  format(
    which: Exclude<DecimalFormat, DecimalFormat.scientific>,
    digits: number,
    removeTrailingZeroes?: boolean,
    groupDigits?: boolean,
  ): string;

  encodeGtv: () => RawGtv;
}

export class InvalidUrlError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}

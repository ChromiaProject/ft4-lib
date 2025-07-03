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

/**
 * Response object for balance queries
 */
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

/**
 * Filter criteria for asset queries
 */
export type AssetFilter = Partial<{
  ids: Array<Buffer> | null;
  name: string | null;
  symbol: string | null;
  type: string | null;
}> | null;

/**
 * Filter criteria for balance queries
 */
export type BalanceFilter = Partial<{
  accountIds?: Array<Buffer> | null;
  assetIds?: Array<Buffer> | null;
}> | null;

/**
 * Filter criteria for transfer history entries
 */
export type TransferHistoryEntryFilter = Partial<{
  accountIds?: Array<Buffer> | null;
  assetIds?: Array<Buffer> | null;
  transactionRids?: Array<Buffer> | null;
  opIndex?: number | null;
}> | null;

/**
 * Filter criteria for crosschain transfer history entries
 */
export type CrosschainTransferHistoryEntryFilter = Partial<{
  accountIds?: Array<Buffer> | null;
  assetIds?: Array<Buffer> | null;
  transactionRids?: Array<Buffer> | null;
  opIndex?: number | null;
}> | null;

/**
 * An amount consists of a value and number of decimals. It wraps a
 * bigint value, and thus has the same limitations as a bigint in terms of size and precision.
 *
 * The `Amount` interface also has methods to perform arithmetic operations on the amount with preserved precision.
 */
export interface Amount {
  value: bigint;
  decimals: number;

  /**
   * Produces a new amount which is the sum of this amount and the specified value
   * @param other - the value to add
   * @returns new amount with the value "this amount" + "other amount"
   */
  plus: (other: SupportedNumber) => Amount;

  /**
   * Produces a new amount which is the difference of this amount and the specified value
   * @param other - the value to subtract
   * @returns new amount with the value "this amount" - "other amount"
   */
  minus: (other: SupportedNumber) => Amount;
  /**
   * Produces a new amount which is the product of this amount and the specified value,
   * optionally specifying the number of decimals the end result should have.
   *
   * @param other - the value to multiply this amount with
   * @param decimals - the number of decimals the end result should have, or "max" for
   *                   the highest value between `this.decimals` and `other.decimals`,
   *                   that is `Math.max(this.decimals, other.decimals)`.
   *                   Defaults to `this.decimals`
   * @returns new amount with the value "this amount" * "other amount"
   */
  times: (other: SupportedNumber, decimals?: number | "max") => Amount;
  /**
   * Produces a new amount which is the quotient of this amount and the specified value (divisor),
   * optionally specifying the number of decimals the end result should have.
   *
   * @param other - the value to divide this amount with
   * @param decimals - the number of decimals the end result should have, or "max" for
   *                   the highest value between `this.decimals` and `other.decimals`,
   *                   that is `Math.max(this.decimals, other.decimals)`.
   *                   Defaults to `this.decimals`
   * @returns new amount with the value "this amount" / "other amount"
   */
  dividedBy: (other: SupportedNumber, decimals?: number | "max") => Amount;

  /**
   * Compares this amount with another value and returns true if this amount is **greater than** the other value
   * @param other - the value to compare
   */
  gt: (other: SupportedNumber) => boolean;
  /**
   * Compares this amount with another value and returns true if this amount is **greater than or equal** to the other value
   * @param other - the value to compare
   */
  gte: (other: SupportedNumber) => boolean;
  /**
   * Compares this amount with another value and returns true if this amount is **lesser than** the other value
   * @param other - the value to compare
   */
  lt: (other: SupportedNumber) => boolean;
  /**
   * Compares this amount with another value and returns true if this amount is **lesser than or equal** to the other value
   * @param other - the value to compare
   */
  lte: (other: SupportedNumber) => boolean;
  /**
   * Compares this amount with another value and returns true if this amount is **equal** to the other value
   * @param other - the value to compare
   */
  eq: (other: SupportedNumber) => boolean;

  /**
   * {@inheritDoc Amount.eq}
   * @param other - the value to compare
   */
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

  /**
   * To be used if you want the precise value, down to the last digit.
   * It must return a string, as a Number could still be overflowed and floating point
   * numbers aren't precise in JS.
   *
   * @param removeTrailingZeroes - if true, trailing zeroes will be removed (0.800 -\> 0.8).
   *                               Defaults to true.
   */
  toString: (removeTrailingZeroes?: boolean) => string;

  /**
   * Returns the amount formatted as a readable string
   * @param which - the DecimalFormat to use
   * @param digits - the number of digits to display
   * @param removeTrailingZeroes - if true, trailing zeroes will be removed (0.800 -\> 0.8)
   *
   * @returns The formatted string. WILL LOSE LOWER DIGIT PRECISION
   *
   * @example
   * scientific, 3-digits: 1.00e+18, 2.47e+3, 5.70e+0, 2.30e-4
   * fixed decimals, 3-digits: 13.750, 1987352342.435, 0.000, 12
   * mixed, 3-digits: 1.00e+18, 1.23e+3, 345, 12.0, 1.45e-1, 1.15e-2 !!NOT 0.01!!
   */
  format(
    which: DecimalFormat.scientific,
    digits: number,
    removeTrailingZeroes?: boolean,
  ): string;

  /**
   * returns the amount formatted as a readable string
   * @param which - the DecimalFormat to use
   * @param digits - the number of digits to display
   * @param removeTrailingZeroes - if true, trailing zeroes will be removed (0.800 -\> 0.8)
   * @param groupDigits - if true, when the format is not scientific, digits will be grouped by three (1234.5678 -\> 1 234.567 8)
   *
   * @returns The formatted string. WILL LOSE LOWER DIGIT PRECISION
   *
   * @example
   * scientific, 3-digits: 1.00e+18, 2.47e+3, 5.70e+0, 2.30e-4
   * fixed decimals, 3-digits: 13.750, 1987352342.435, 0.000, 12
   * mixed, 3-digits: 1.00e+18, 1.23e+3, 345, 12.0, 1.45e-1, 1.15e-2 !!NOT 0.01!!
   *
   */
  format(
    which: Exclude<DecimalFormat, DecimalFormat.scientific>,
    digits: number,
    removeTrailingZeroes?: boolean,
    groupDigits?: boolean,
  ): string;

  /**
   * Serializes this amount to its `gtv` representation to be used when submitting it to the blockchain
   */
  encodeGtv: () => RawGtv;
}

/**
 * Error thrown if an asset is instantiated with an invalid URL.
 */
export class InvalidUrlError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}

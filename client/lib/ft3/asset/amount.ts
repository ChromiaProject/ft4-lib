import { Amount } from "./interfaces";
import { DecimalFormat, SupportedNumber } from "./types";

type RawAmount = { value: bigint; decimals: number };
type AnyAssetAmount = RawAmount | Amount;

export const MAX = BigInt("0x" + "f".repeat(64)); //2^256-1 (16^64) = 2^(4*64)

export class AmountInputError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.message = msg;
    this.name = "AmountInputError";
  }
}

export class AmountOutOfRangeError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.message = msg;
    this.name = "AmountOutOfRangeError";
  }
}

export class AmountDecimalsError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.message = msg;
    this.name = "AmountDecimalsError";
  }
}

export const amount = {
  MAX,
  create: createAmount,
  sum,
  sub,
  mul,
  div,
  format,
  stringify,
};

function buildAmountObject(amount: RawAmount): Amount {
  return Object.freeze({
    value: amount.value,
    decimals: amount.decimals,

    plus: (other: SupportedNumber) => sum(amount, other),
    minus: (other: SupportedNumber) => sub(amount, other),
    times: (other: string | number | bigint) => mul(amount, other),
    dividedBy: (other: string | number | bigint) => div(amount, other),

    gt: (other: SupportedNumber) => gt(amount, other),
    gte: (other: SupportedNumber) => gte(amount, other),
    lt: (other: SupportedNumber) => lt(amount, other),
    lte: (other: SupportedNumber) => lte(amount, other),
    eq: (other: SupportedNumber) => eq(amount, other),

    toString: () => stringify(amount),
    format: function (
      which: DecimalFormat,
      digits: number,
      removeTrailingZeroes?: boolean,
      groupDigits?: boolean
    ) {
      return format(amount, which, digits, removeTrailingZeroes, groupDigits);
    },

    encodeGtv: () => amount.value,
  });
}

/**
 * Returns a new asset amount.
 *
 * @param num - The desired value for the amount.
 * @param decimals - The desired number of decimal digits.
 *
 * @returns An asset amount with the specified value, and decimal digits added to it if needed.
 * For compatibility with blockchain return values, BigInts input values are considered
 * to be referring to the smallest divisor. See the example below.
 *
 * @example
 * createAmount(1, 2) // returns 100
 * createAmount("1", 2) // returns 100
 * createAmount(1n, 2) // returns 0.01
 */
export function createAmount(num: SupportedNumber, decimals?: number): Amount {
  if (decimals !== undefined && (decimals < 0 || !Number.isInteger(decimals))) {
    throw new AmountDecimalsError("Decimals must be a positive integer number");
  }
  const amount: RawAmount = { value: BigInt(0), decimals: 0 };
  if (typeof num === "string" || typeof num === "number") {
    let _num = num.toString();
    if (!_num.match(/^-?\d*\.?\d*$/))
      throw new AmountInputError(
        "Formatting error: '" + _num + "' is not a base-10 number"
      );
    const numDecimals = _num.split(".")[1]?.length ?? 0;
    _num = _num.replace(".", "");
    amount.decimals = decimals ?? numDecimals;
    let value: bigint;
    if (decimals === null || decimals === undefined) {
      value = BigInt(_num);
    } else if (numDecimals <= decimals) {
      value = BigInt(_num + "0".repeat(decimals - numDecimals));
    } else {
      value = BigInt(_num.slice(0, decimals - numDecimals));
    }
    checkValueInRange(value);
    amount.value = value;
  } else if (typeof num === "bigint") {
    checkValueInRange(num);
    amount.value = num;
    amount.decimals = decimals || 0;
  } else {
    if (decimals !== num.decimals && decimals !== undefined)
      throw new AmountDecimalsError(
        "Incompatible arguments: decimals, num.decimals"
      );
    checkValueInRange(num.value);
    amount.value = num.value;
    amount.decimals = num.decimals;
  }
  return buildAmountObject(amount);
}

/**
 * Checks that a value is in the range [-2^256+1, 2^256-1].
 * @param val - The value to check
 */
export function checkValueInRange(val: bigint) {
  if (val >= MAX || val <= -MAX)
    throw new AmountOutOfRangeError(
      "Numbers with absolute value above 2^256 - 1 are not supported"
    );
}

/**
 * To be used if you want the precise value. Can be formatted starting from here
 * must return a string, as a Number could still be overflowed and it won't be an integer
 *
 * @returns The amount as string
 */
export function stringify(amount: AnyAssetAmount): string {
  let s = amount.value.toString();
  let negative = false;
  if (s.startsWith("-")) {
    s = s.slice(1);
    negative = true;
  }
  const int = s.substring(0, s.length - amount.decimals) || "0";
  const decimals = s
    .substring(s.length - amount.decimals)
    .padStart(amount.decimals, "0")
    .replace(/0+$/, "");
  return (negative ? "-" : "") + int + (decimals ? "." + decimals : "");
}

/**
 * returns the amount formatted as a readable string
 * @param amount - the amount to format
 * @param which - the DecimalFormat to use
 * @param digits - the number of digits to display
 * @param removeTrailingZeroes - if true, trailing zeroes will be removed (0.800 -> 0.8)
 * @param groupDigits - if true, when the format is not scientific, digits will be grouped by three (1234.5678 -> 1 234.567 8)
 *
 * @returns The formatted string. WILL LOSE LOWER DIGIT PRECISION
 *
 * @example
 * scientific, 3-digits: 1.00e+18, 2.47e+3, 5.70e+0, 2.30e-4
 * fixed decimals, 3-digits: 13.750, 1987352342.435, 0.000, 12
 * mixed, 3-digits: 1.00e+18, 1.23e+3, 345, 12.0, 1.45e-1, 1.15e-2 !!NOT 0.01!!
 *
 */
export function format(
  amount: AnyAssetAmount,
  which: DecimalFormat,
  digits: number,
  removeTrailingZeroes = false,
  groupDigits = true
): string {
  if (digits > 15) {
    throw new AmountInputError(
      "You can't use format() for high-precision output. Please use stringify()"
    );
  }
  switch (which) {
    case DecimalFormat.scientific:
      return toScientific(amount, digits, removeTrailingZeroes);

    case DecimalFormat.fixedDecimals:
      return toFixedDecimals(amount, digits, removeTrailingZeroes, groupDigits);

    case DecimalFormat.mixed: {
      const orderOfMag = amount.value.toString().length - amount.decimals;
      if (orderOfMag > 0 && orderOfMag <= digits) {
        return toFixedDecimals(
          amount,
          digits - orderOfMag,
          removeTrailingZeroes,
          groupDigits
        );
      } else return toScientific(amount, digits, removeTrailingZeroes);
    }

    default:
      throw new AmountInputError("Format '" + which + "' not recognized.");
  }
}

export function toScientific(
  amount: AnyAssetAmount,
  digits: number,
  removeTrailingZeroes = false
) {
  const formatted = Number(stringify(amount)).toExponential(digits - 1);
  if (removeTrailingZeroes) return formatted.replace(/\.?0+e/, "e");
  else return formatted;
}

export function toFixedDecimals(
  amount: AnyAssetAmount,
  digits: number,
  removeTrailingZeroes = false,
  groupDigits = true
) {
  const s = stringify(amount);
  let [int, decimals] = s.split("."); //decimals may be undefined
  if (groupDigits) {
    int = int.replace(/(\d)(?=(\d{3})+$)/g, "$1 ");
  }
  if (decimals) {
    decimals = decimals.substring(0, digits + 1).padEnd(digits + 1, "0");

    if (Number(decimals.charAt(decimals.length - 1)) > 4) {
      decimals = decimals.slice(0, -2) + (Number(decimals.slice(-2, -1)) + 1);
    } else {
      decimals = decimals.slice(0, -1);
    }
    if (groupDigits) {
      decimals = decimals.replace(/(\d{3})/g, "$1 ").trimEnd();
    }
    const formatted = int + "." + decimals;
    if (removeTrailingZeroes) return formatted.replace(/\.?[0 ]*$/, "");
    else return formatted;
  } else return int; //never remove trailing zeroes
}

export function sum(amount: AnyAssetAmount, other: SupportedNumber): Amount {
  const o = requireSameDecimals(amount, other);
  const resultVal = amount.value + o.value;
  return createAmount(resultVal, amount.decimals);
}

export function sub(amount: AnyAssetAmount, other: SupportedNumber): Amount {
  if (typeof other !== "object") return sum(amount, -other);
  return sum(amount, createAmount(-other.value, other.decimals));
}

export function mul(
  amount: AnyAssetAmount,
  other: string | number | bigint
): Amount {
  const _other = BigInt(other);
  const resultVal = amount.value * _other;
  return createAmount(resultVal, amount.decimals);
}

export function div(
  amount: AnyAssetAmount,
  other: string | number | bigint
): Amount {
  const _other = BigInt(other);
  if (!_other)
    throw new AmountInputError("AssetAmount: invalid divisor (" + other + ")");
  const resultVal = amount.value / _other;
  return createAmount(resultVal, amount.decimals);
}

//Comparisons

export function eq(amount: AnyAssetAmount, other: SupportedNumber): boolean {
  const o = requireSameDecimals(amount, other);
  return amount.value === o.value;
}

export function gt(amount: AnyAssetAmount, other: SupportedNumber): boolean {
  const o = requireSameDecimals(amount, other);
  return amount.value > o.value;
}

export function lt(amount: AnyAssetAmount, other: SupportedNumber): boolean {
  const o = requireSameDecimals(amount, other);
  return amount.value < o.value;
}

export function gte(amount: AnyAssetAmount, other: SupportedNumber): boolean {
  const o = requireSameDecimals(amount, other);
  return amount.value >= o.value;
}

export function lte(amount: AnyAssetAmount, other: SupportedNumber): boolean {
  const o = requireSameDecimals(amount, other);
  return amount.value <= o.value;
}

//Utilities

function requireSameDecimals(
  amount: AnyAssetAmount,
  other: SupportedNumber
): Amount {
  try {
    return createAmount(other, amount.decimals);
  } catch (e) {
    if (e instanceof AmountDecimalsError) {
      //they're amounts referring to two different tokens
      throw new AmountDecimalsError(
        "Cannot sum, subtract or compare two Amounts with different amount of " +
          `decimals: amount (${amount.decimals}), other ` +
          `(${(<AnyAssetAmount>other).decimals})`
      );
    } else throw e;
  }
}

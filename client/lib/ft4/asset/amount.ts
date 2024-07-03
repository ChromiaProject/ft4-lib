import {
  AmountDecimalsError,
  AmountInputError,
  AmountOutOfRangeError,
} from "./error";
import {
  Amount,
  AnyAssetAmount,
  DecimalFormat,
  RawAmount,
  SupportedNumber,
} from "./types";

// (2^256)-1 = (2^(4*64))-1 = (16^64)-1
export const MAX = BigInt("0x" + "f".repeat(64));

function buildAmountObject(amount: RawAmount): Amount {
  checkValueInRange(amount.value);

  return Object.freeze({
    value: amount.value,
    decimals: amount.decimals,

    plus: (other: SupportedNumber) =>
      sum(amount, convertToRawAmount(other, amount.decimals)),
    minus: (other: SupportedNumber) =>
      sub(amount, convertToRawAmount(other, amount.decimals)),

    times: (other: SupportedNumber, decimals?: number | "max") =>
      mul(amount, other, decimals),
    dividedBy: (other: SupportedNumber, decimals?: number | "max") =>
      div(amount, other, decimals),

    gt: (other: SupportedNumber) =>
      gt(amount, convertToRawAmount(other, amount.decimals)),
    gte: (other: SupportedNumber) =>
      gte(amount, convertToRawAmount(other, amount.decimals)),
    lt: (other: SupportedNumber) =>
      lt(amount, convertToRawAmount(other, amount.decimals)),
    lte: (other: SupportedNumber) =>
      lte(amount, convertToRawAmount(other, amount.decimals)),
    eq: (other: SupportedNumber) =>
      eq(amount, convertToRawAmount(other, amount.decimals)),

    equals: (other: SupportedNumber) =>
      eq(amount, convertToRawAmount(other, amount.decimals)),

    compare: (other: SupportedNumber) =>
      compare(amount, convertToRawAmount(other, amount.decimals)),

    toString: (removeTrailingZeroes?: boolean) =>
      stringify(amount, removeTrailingZeroes),
    format: function (
      which: DecimalFormat,
      digits: number,
      removeTrailingZeroes?: boolean,
      groupDigits?: boolean,
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
 * Be careful with blockchain return values! They are generally represented as big integers,
 * removing the decimal point. If you want to use (num: 1000, decimals: 3) to represent
 * 1.000, you should use createAmountFromBalance(1000, 3) instead.
 *
 * @example
 * createAmount(1, 2) // returns 1.00
 * createAmount("1", 2) // returns 1.00
 */
export function createAmount(num: SupportedNumber, decimals?: number): Amount {
  const rawAmount = convertToRawAmount(num, decimals);
  return buildAmountObject(rawAmount);
}

/**
 * Returns a new asset amount.
 *
 * @param num - The desired value for the amount, specified as smallest divisor.
 * @param decimals - The desired number of decimal digits.
 *
 * @returns An asset amount with the specified value, and a decimal point added to it if needed.
 * In this function, 1 is always the smallest non-zero amount that can be represented.
 * If you want to convert user input to amounts, you'll probably want to use createAmount
 * instead.
 *
 * @example
 * createAmountFromBalance(1, 2) // returns 0.01
 * createAmountFromBalance(100, 2) // returns 1.00
 */
export function createAmountFromBalance(
  num: bigint,
  decimals?: number,
): Amount {
  const rawAmount = convertToRawAmount(num, decimals);
  return buildAmountObject(rawAmount);
}

/**
 * Convert a SupportedNumber or RawAmount into RawAmount with optional specified decimals.
 * The function throws error under these conditions:
 * - When the input number is not a base-10 number.
 * - When the specified decimals is not an integer number between 0 and 78 (inclusive).
 * - When the decimals argument is incompatible with num.decimals.
 * - When the calculated value is out of range.
 *
 * @param num - The input number to convert.
 * @param decimals - The optional number of decimals to use for the conversion.
 * @returns - The converted RawAmount.
 * @throws Will throw an error if the input number is not a base-10 number or the specified decimals is invalid.
 */
export function convertToRawAmount(
  num: SupportedNumber | bigint,
  decimals?: number,
): RawAmount {
  if (decimals !== undefined) requireValidDecimals(decimals);

  let value: bigint;
  let amountDecimals = decimals ?? 0;

  switch (typeof num) {
    case "bigint":
      //a bigint is often a response, so (100n, 3) is interpreted as 0.1
      value = num;
      break;

    case "string":
    case "number": {
      const numStr = num.toString();

      /**
       * Matches numbers in following formats:
       * 0.1
       * 1.0
       * .3
       * 1
       * 5.
       * All of these formats may have a minus sign at the start, e.g. -.3
       */
      if (!/^-?\d*\.?\d*$/.test(numStr) || !/\d/.test(numStr)) {
        throw new AmountInputError(
          `Formatting error: '${numStr}' is not a base-10 number`,
        );
      }

      const [whole, fraction = ""] = numStr.split(".");
      //decimals has priority. (1.234, 2) is 1.23
      amountDecimals = decimals ?? fraction.length;
      // add zeroes if needed, e.g.
      //   (1.234, 5) -> "123400"
      // remove extra digits if needed
      //   (1.234, 1) -> "12"
      value = BigInt(
        whole + fraction.padEnd(amountDecimals, "0").slice(0, amountDecimals),
      );
      break;
    }

    default: // if it's not string, number or bigint, it's an object
      if (decimals !== num.decimals && decimals !== undefined) {
        throw new AmountDecimalsError(
          `Incompatible arguments: decimals (${decimals}), num.decimals (${num.decimals})`,
        );
      }
      value = num.value;
      amountDecimals = num.decimals;
      break;
  }

  checkValueInRange(value);
  return { value, decimals: amountDecimals };
}

/**
 * Checks that a value is in the range [-2^256+1, 2^256-1] for EVM compatibility.
 * @param val - The value to check
 */
export function checkValueInRange(val: bigint) {
  if (val >= MAX || val <= -MAX)
    throw new AmountOutOfRangeError(
      "Numbers with absolute value above 2^256 - 1 are not supported",
    );
}

/**
 * {@inheritDoc Amount.toString}
 *
 * @param amount - the amount to format
 * @param removeTrailingZeroes - if true, trailing zeroes will be removed (0.800 -\> 0.8).
 *                               Defaults to true.
 *
 * @returns The amount as string
 */
export function stringify(
  amount: AnyAssetAmount,
  removeTrailingZeroes = true,
): string {
  /**
   * amount.value is a BigInt, so this string will have all decimal digits
   * e.g. (12.3, 5 decimals) is 1230000n as a BigInt
   */
  let s = amount.value.toString();
  let negative = false;
  if (s.startsWith("-")) {
    s = s.slice(1);
    negative = true;
  }
  // the integer part is "how many digits more than decimals we have" or 0
  const int = s.substring(0, s.length - amount.decimals) || "0";
  /**
   * the decimal part is all the digits after the integer ones, adding zeros
   * at the start if there's less digits than specified by decimals
   * e.g.
   * (0.00327, 5 digits) will be represented as 327n.
   *   - integer part: 0
   *   - decimal part: 00327
   */
  let decimals = s
    .substring(s.length - amount.decimals)
    .padStart(amount.decimals, "0");
  if (removeTrailingZeroes) {
    decimals = decimals.replace(/0+$/, "");
  }
  //if negative add -, then int part (even if 0), then add point and decimals if non-empty
  return (negative ? "-" : "") + int + (decimals ? `.${decimals}` : "");
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
  groupDigits = true,
): string {
  if (digits > 15) {
    throw new AmountInputError(
      "You can't use format() for high-precision output. Please use stringify()",
    );
  }
  switch (which) {
    case DecimalFormat.scientific:
      return toScientific(amount, digits, removeTrailingZeroes);

    case DecimalFormat.fixedDecimals:
      return toFixedDecimals(amount, digits, removeTrailingZeroes, groupDigits);

    case DecimalFormat.mixed: {
      const orderOfMag = amount.value.toString().length - amount.decimals;
      /**
       * Write the number in scientific only if writing it in normal notation
       * would take more than <digits> characters
       */
      if (orderOfMag > 0 && orderOfMag <= digits) {
        return toFixedDecimals(
          amount,
          digits - orderOfMag,
          removeTrailingZeroes,
          groupDigits,
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
  removeTrailingZeroes = false,
) {
  const formatted = Number(stringify(amount, false)).toExponential(digits - 1);
  if (removeTrailingZeroes) return formatted.replace(/\.?0+e/, "e");
  else return formatted;
}

export function toFixedDecimals(
  amount: AnyAssetAmount,
  digits: number,
  removeTrailingZeroes = false,
  groupDigits = true,
) {
  const s = stringify(amount, false);
  let [int, decimals] = s.split("."); //decimals may be undefined
  if (groupDigits) {
    // add a space before every group of three digits (1 000.3)
    int = int.replace(/(\d)(?=(\d{3})+$)/g, "$1 ");
  }
  if (decimals) {
    // cut all extra digits away, leave one for rounding
    decimals = decimals.substring(0, digits + 1);

    if (decimals.length > digits) {
      if (Number(decimals.charAt(decimals.length - 1)) > 4) {
        // round up if last digit >= 5
        decimals = decimals.slice(0, -2) + (Number(decimals.slice(-2, -1)) + 1);
      } else {
        // truncate otherwise
        decimals = decimals.slice(0, -1);
      }
    }

    if (groupDigits) {
      // add a space after every group of three digits 3.000 4
      decimals = decimals.replace(/(\d{3})/g, "$1 ").trimEnd();
    }

    const formatted = int + "." + decimals;

    if (removeTrailingZeroes) return formatted.replace(/\.?[0 ]*$/, "");
    else return formatted;
  } else return int; //never remove trailing zeroes when we have no decimals
}

function sum(amount: RawAmount, other: RawAmount): Amount {
  requireSameDecimals(amount, other);
  const resultVal = amount.value + other.value;
  return buildAmountObject({ value: resultVal, decimals: amount.decimals });
}

function sub(amount: RawAmount, other: RawAmount): Amount {
  requireSameDecimals(amount, other);
  const resultVal = amount.value - other.value;
  return buildAmountObject({ value: resultVal, decimals: amount.decimals });
}

function resolveDecimals(
  amount1: RawAmount,
  amount2: RawAmount,
  decimals?: number | "max",
): number {
  if (typeof decimals === "number") {
    requireValidDecimals(decimals);
    return decimals;
  } else if (decimals === "max") {
    return Math.max(amount1.decimals, amount2.decimals);
  } else {
    return amount1.decimals;
  }
}

function mul(
  amount: RawAmount,
  other: SupportedNumber,
  decimals?: number | "max",
): Amount {
  const o = convertToRawAmount(other);
  const dec = resolveDecimals(amount, o, decimals);
  const decimalShiftNeeded = dec - amount.decimals - o.decimals;

  let resultVal: bigint;
  if (decimalShiftNeeded >= 0) {
    const factor = 10n ** BigInt(decimalShiftNeeded);
    resultVal = amount.value * o.value * factor;
  } else {
    const factor = 10n ** BigInt(-decimalShiftNeeded);
    resultVal = (amount.value * o.value) / factor;
  }
  return buildAmountObject({ value: resultVal, decimals: dec });
}

function div(
  amount: RawAmount,
  other: SupportedNumber,
  decimals?: number | "max",
): Amount {
  const o = convertToRawAmount(other);
  if (o.value === BigInt(0)) {
    throw new AmountInputError("AssetAmount: invalid divisor (0)");
  }

  const dec = resolveDecimals(amount, o, decimals);
  const decimalShiftNeeded = dec - amount.decimals + o.decimals;

  let resultVal: bigint;
  if (decimalShiftNeeded >= 0) {
    const factor = 10n ** BigInt(decimalShiftNeeded);
    resultVal = (amount.value * factor) / o.value;
  } else {
    const factor = 10n ** BigInt(-decimalShiftNeeded);
    resultVal = amount.value / (o.value * factor);
  }

  return buildAmountObject({
    value: resultVal,
    decimals: dec,
  });
}

function eq(amount: RawAmount, other: RawAmount): boolean {
  requireSameDecimals(amount, other);
  return amount.value === other.value;
}

function gt(amount: RawAmount, other: RawAmount): boolean {
  requireSameDecimals(amount, other);
  return amount.value > other.value;
}

function lt(amount: RawAmount, other: RawAmount): boolean {
  requireSameDecimals(amount, other);
  return amount.value < other.value;
}

function gte(amount: RawAmount, other: RawAmount): boolean {
  requireSameDecimals(amount, other);
  return amount.value >= other.value;
}

function lte(amount: AnyAssetAmount, other: RawAmount): boolean {
  requireSameDecimals(amount, other);
  return amount.value <= other.value;
}

function compare(amount: AnyAssetAmount, other: RawAmount): number {
  requireSameDecimals(amount, other);
  return amount.value < other.value ? -1 : amount.value > other.value ? 1 : 0;
}

function requireSameDecimals(amount: AnyAssetAmount, other: RawAmount): void {
  if (amount.decimals !== other.decimals) {
    throw new AmountDecimalsError(
      "Cannot sum, subtract or compare two Amounts with different amount of " +
        `decimals: amount (${amount.decimals}), other ` +
        `(${other.decimals})`,
    );
  }
}

function requireValidDecimals(decimals: number) {
  if (decimals < 0 || !Number.isInteger(decimals) || decimals > 78) {
    throw new AmountDecimalsError(
      "Decimals must be an integer number between 0 and 78 (inclusive)",
    );
  }
}

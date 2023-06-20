import { RawGtv } from "postchain-client/built/src/gtv/types";
import { DecimalFormat, SupportedNumber } from "./types";

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

  toString: () => string;
  format(
    which: DecimalFormat.scientific,
    digits: number,
    removeTrailingZeroes?: boolean
  ): string;
  format(
    which: Exclude<DecimalFormat, DecimalFormat.scientific>,
    digits: number,
    removeTrailingZeroes?: boolean,
    groupDigits?: boolean
  ): string;

  encodeGtv: () => RawGtv;
}

export class InvalidUrlError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}

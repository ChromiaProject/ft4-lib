/**
 * Thrown to indicate that the user tried to supply
 * an invalid value when creating an amount.
 */
export class AmountInputError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AmountInputError";
  }
}

/**
 * Thrown to indicate that the result of an operation
 * involving an amount, and would have produced an amount,
 * is too big to fit inside an amount without losing precision
 */
export class AmountOutOfRangeError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AmountOutOfRangeError";
  }
}

/**
 * Thrown to indicate an error with the number of decimals
 * with an amount. Could for example be that number of decimals
 * is too big, or that an operation is trying to be applied on two
 * amounts with different number of decimals.
 */
export class AmountDecimalsError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AmountDecimalsError";
  }
}

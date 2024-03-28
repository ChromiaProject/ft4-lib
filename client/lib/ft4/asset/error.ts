
export class AmountInputError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AmountInputError";
  }
}

export class AmountOutOfRangeError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AmountOutOfRangeError";
  }
}

export class AmountDecimalsError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AmountDecimalsError";
  }
}
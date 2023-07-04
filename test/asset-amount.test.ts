import {
  AmountDecimalsError,
  AmountInputError,
  AmountOutOfRangeError,
  RawAmount,
  convertToRawAmount,
  createAmount,
  createAmountFromBalance,
  stringify,
} from "../client/lib/ft4/asset/amount";
import { DecimalFormat } from "../client/lib/ft4/asset/types";

describe("Asset amount", () => {
  const amounts = [
    [
      createAmount(1, 1),
      createAmount(-25.36, 0),
      createAmount(1e5, 5),
      createAmount(-42.42, 5),
      createAmount(-42.42, 1),
      createAmount(-42.42),
      createAmount(42),
      createAmount(0.13, 4),
      createAmount(0.02, 3),
      createAmount(2, 15),
      createAmount(0xa0, 1),
    ],
    [
      createAmount("1", 1),
      createAmount("-25.36", 0),
      createAmount("100000", 5),
      createAmount("-42.42", 5),
      createAmount("-42.42", 1),
      createAmount("-42.42"),
      createAmount("42"),
      createAmount("0.13", 4),
      createAmount(".02", 3),
      createAmount("2", 15),
      createAmount("160", 1),
    ],
    [
      createAmountFromBalance(BigInt("10"), 1),
      createAmountFromBalance(BigInt(-25), 0),
      createAmountFromBalance(BigInt("10000000000"), 5),
      createAmountFromBalance(BigInt("-4242000"), 5),
      createAmountFromBalance(BigInt("-424"), 1),
      createAmountFromBalance(BigInt("-4242"), 2),
      createAmountFromBalance(BigInt("0x2a")),
      createAmountFromBalance(BigInt("1300"), 4),
      createAmountFromBalance(BigInt("0b10100"), 3),
      createAmountFromBalance(BigInt("2000000000000000"), 15),
      createAmountFromBalance(BigInt("0x640"), 1),
    ],
  ];

  it.each(amounts)("should correctly build instances", async (...numbers) => {
    expect(numbers.map((num) => num.decimals)).toEqual([
      1, 0, 5, 5, 1, 2, 0, 4, 3, 15, 1,
    ]);
    expect(numbers.map((num) => num.value)).toEqual([
      BigInt(10),
      BigInt(-25),
      BigInt("1" + "0".repeat(10)),
      BigInt(-4242000),
      BigInt(-424),
      BigInt(-4242),
      BigInt(42),
      BigInt(1300),
      BigInt(20),
      BigInt("2" + "0".repeat(15)),
      BigInt(1600),
    ]);
    expect(numbers.map((n) => stringify(n))).toEqual([
      "1",
      "-25",
      "100000",
      "-42.42",
      "-42.4",
      "-42.42",
      "42",
      "0.13",
      "0.02",
      "2",
      "160",
    ]);
  });

  it("should fail building instances with wrong parameters", async () => {
    expect(() => createAmount("something", 1)).toThrow(AmountInputError);
    expect(() => createAmount("1.4.5", 10)).toThrow(AmountInputError);
    expect(() => createAmount("0xaefdaf", 1)).toThrow(AmountInputError);
    expect(() => createAmount("0o167234", 1)).toThrow(AmountInputError);
    expect(() => createAmount("0b011011", 1)).toThrow(AmountInputError);
    expect(() => createAmount(10, -1)).toThrow(AmountDecimalsError);
    expect(() => createAmount(2, 77)).toThrow(AmountOutOfRangeError);
    expect(() => createAmount(1, 78)).toThrow(AmountOutOfRangeError);
    expect(() => createAmount(0.1, 79)).toThrow(AmountDecimalsError);
    const outOfBounds = BigInt("0x1" + "0".repeat(64));
    expect(() => createAmountFromBalance(outOfBounds, 0)).toThrow(
      AmountOutOfRangeError
    );
  });

  it("should format correctly in fixedDecimal format", async () => {
    const amounts = [
      createAmount(1234567890, 1),
      createAmount(12.123456789, 20),
      createAmount("1234567890.12345678901", 20),
      createAmount(1.00000000001, 20),
      createAmount("0.00000000001", 20),
      createAmount("10000000000.1", 20),
    ];

    expect(
      amounts.map((num) => num.format(DecimalFormat.fixedDecimals, 4))
    ).toEqual([
      "1 234 567 890.0",
      "12.123 5",
      "1 234 567 890.123 5",
      "1.000 0",
      "0.000 0",
      "10 000 000 000.100 0",
    ]);
    expect(
      amounts.map((num) => num.format(DecimalFormat.fixedDecimals, 5, true))
    ).toEqual([
      "1 234 567 890",
      "12.123 46",
      "1 234 567 890.123 46",
      "1",
      "0",
      "10 000 000 000.1",
    ]);
    expect(
      amounts.map((num) =>
        num.format(DecimalFormat.fixedDecimals, 4, false, false)
      )
    ).toEqual([
      "1234567890.0",
      "12.1235",
      "1234567890.1235",
      "1.0000",
      "0.0000",
      "10000000000.1000",
    ]);
    expect(
      amounts.map((num) =>
        num.format(DecimalFormat.fixedDecimals, 4, true, false)
      )
    ).toEqual([
      "1234567890",
      "12.1235",
      "1234567890.1235",
      "1",
      "0",
      "10000000000.1",
    ]);
  });

  it("should format correctly in scientific format", async () => {
    const amounts = [
      createAmount(1234567890, 1),
      createAmount(12.123456789, 20),
      createAmount("11234567890.12345678901", 20),
      createAmount(1.00000000001, 20),
      createAmount("0.00000000001", 20),
      createAmount("10000000000.1", 20),
    ];

    expect(
      amounts.map((num) => num.format(DecimalFormat.scientific, 4))
    ).toEqual([
      "1.235e+9",
      "1.212e+1",
      "1.123e+10",
      "1.000e+0",
      "1.000e-11",
      "1.000e+10",
    ]);
    expect(
      amounts.map((num) => num.format(DecimalFormat.scientific, 5, true))
    ).toEqual([
      "1.2346e+9",
      "1.2123e+1",
      "1.1235e+10",
      "1e+0",
      "1e-11",
      "1e+10",
    ]);
    expect(
      amounts.map((num) => num.format(DecimalFormat.scientific, 4, false))
    ).toEqual([
      "1.235e+9",
      "1.212e+1",
      "1.123e+10",
      "1.000e+0",
      "1.000e-11",
      "1.000e+10",
    ]);
    expect(
      amounts.map((num) => num.format(DecimalFormat.scientific, 4, true))
    ).toEqual(["1.235e+9", "1.212e+1", "1.123e+10", "1e+0", "1e-11", "1e+10"]);
  });

  it("should format correctly in mixed format", async () => {
    const amounts = [
      createAmount(1234567890, 1),
      createAmount(12.123456789, 20),
      createAmount("11234567890.12345678901", 20),
      createAmount(1.00000000001, 20),
      createAmount("0.00000000001", 20),
      createAmount("10000000000.1", 20),
    ];

    expect(amounts.map((num) => num.format(DecimalFormat.mixed, 4))).toEqual([
      "1.235e+9",
      "12.12",
      "1.123e+10",
      "1.000",
      "1.000e-11",
      "1.000e+10",
    ]);
    expect(
      amounts.map((num) => num.format(DecimalFormat.mixed, 6, true))
    ).toEqual(["1.23457e+9", "12.123 5", "1.12346e+10", "1", "1e-11", "1e+10"]);
    expect(
      amounts.map((num) => num.format(DecimalFormat.mixed, 6, false, false))
    ).toEqual([
      "1.23457e+9",
      "12.1235",
      "1.12346e+10",
      "1.00000",
      "1.00000e-11",
      "1.00000e+10",
    ]);
    expect(
      amounts.map((num) => num.format(DecimalFormat.mixed, 2, true, false))
    ).toEqual(["1.2e+9", "12", "1.1e+10", "1", "1e-11", "1e+10"]);
  });

  it("should add correctly", async () => {
    const first = createAmount(100, 0);
    const second = createAmount(10, 0);
    const secondNegative = createAmount(-10, 0);
    const incompatible = createAmount(1000, 1);

    expect(first.plus(second).toString()).toEqual("110");
    expect(first.plus(secondNegative).toString()).toEqual("90");
    expect(secondNegative.plus(secondNegative).toString()).toEqual("-20");
    expect(secondNegative.plus(second).toString()).toEqual("0");
    expect(() => first.plus(incompatible)).toThrow(AmountDecimalsError);
    expect(first.toString()).toEqual("100");
    expect(second.toString()).toEqual("10");
    expect(secondNegative.toString()).toEqual("-10");
    expect(incompatible.toString()).toEqual("1000");
  });

  it("should subtract correctly", async () => {
    const first = createAmount(100, 10);
    const second = createAmount(10, 10);
    const secondNegative = createAmount(-10, 10);
    const incompatible = createAmount(1000, 1);

    expect(first.minus(second).toString()).toEqual("90");
    expect(first.minus(secondNegative).toString()).toEqual("110");
    expect(secondNegative.minus(secondNegative).toString()).toEqual("0");
    expect(secondNegative.minus(second).toString()).toEqual("-20");
    expect(() => first.minus(incompatible)).toThrow(AmountDecimalsError);
    expect(first.toString()).toEqual("100");
    expect(second.toString()).toEqual("10");
    expect(secondNegative.toString()).toEqual("-10");
    expect(incompatible.toString()).toEqual("1000");
  });

  it("should multiply correctly", async () => {
    const first = createAmount(100, 10);
    const firstNegative = createAmount(-100, 10);

    expect(first.times(2).toString()).toEqual("200");
    expect(first.times(-2).toString()).toEqual("-200");
    expect(firstNegative.times(2).toString()).toEqual("-200");
    expect(firstNegative.times(-2).toString()).toEqual("200");
    expect(first.toString()).toEqual("100");
    expect(firstNegative.toString()).toEqual("-100");
  });

  it("should divide correctly", async () => {
    const first = createAmount(100, 0);
    const firstNegative = createAmount(-100, 0);

    expect(first.dividedBy(2).toString()).toEqual("50");
    expect(first.dividedBy(-2).toString()).toEqual("-50");
    expect(firstNegative.dividedBy(2).toString()).toEqual("-50");
    expect(firstNegative.dividedBy(-2).toString()).toEqual("50");
    expect(firstNegative.dividedBy("-2").toString()).toEqual("50");
    expect(() => first.dividedBy(0)).toThrow(AmountInputError);
    expect(() => firstNegative.dividedBy("0")).toThrow(AmountInputError);
    expect(first.toString()).toEqual("100");
    expect(firstNegative.toString()).toEqual("-100");
  });

  it("should throw when out of bounds (2^256)", async () => {
    const first = createAmount(1, 77);
    const firstNegative = createAmount(-1, 77);

    expect(() => first.plus(first)).toThrow(AmountOutOfRangeError);
    expect(() => firstNegative.plus(firstNegative)).toThrow(
      AmountOutOfRangeError
    );
    expect(() => first.times(2)).toThrow(AmountOutOfRangeError);
    expect(() => firstNegative.times(2)).toThrow(AmountOutOfRangeError);
    expect(first.format(DecimalFormat.scientific, 1)).toEqual("1e+0");
    expect(firstNegative.format(DecimalFormat.scientific, 1)).toEqual("-1e+0");
  });

  it("should behave like integers", async () => {
    const first = createAmount(1, 0);
    const firstNegative = createAmount(-1, 0);
    const second = createAmount(1, 3);
    const secondNegative = createAmount(-1, 3);
    expect(first.dividedBy(3).times(4).toString()).toBe("0");
    expect(firstNegative.dividedBy(3).times(4).toString()).toBe("0");
    expect(second.dividedBy(3).times(4).toString()).toBe("1.332");
    expect(secondNegative.dividedBy(3).times(4).toString()).toBe("-1.332");
  });

  it("should compare properly with no decimals", async () => {
    const first = createAmount(1, 0);
    const firstCopy = createAmount("1", 0);
    const firstNegative = createAmount(-1, 0);
    expect(first.gt(firstNegative)).toBe(true);
    expect(first.lt(firstNegative)).toBe(false);
    expect(first.eq(firstNegative)).toBe(false);
    expect(first.gte(firstNegative)).toBe(true);
    expect(first.lte(firstNegative)).toBe(false);
    expect(first.eq(firstCopy)).toBe(true);
  });

  it("should compare properly with decimals", async () => {
    const second = createAmount(1, 3);
    const secondCopy = createAmount("1", 3);
    const third = createAmount(1.5, 3);
    expect(second.gt(third)).toBe(false);
    expect(second.lt(third)).toBe(true);
    expect(second.eq(third)).toBe(false);
    expect(second.gte(third)).toBe(false);
    expect(second.lte(third)).toBe(true);
    expect(second.eq(secondCopy)).toBe(true);
  });

  it("should not compare different decimal amounts", async () => {
    const first = createAmount(1, 0);
    const second = createAmount(1, 3);
    expect(() => first.gt(second)).toThrow(AmountDecimalsError);
    expect(() => first.lt(second)).toThrow(AmountDecimalsError);
    expect(() => first.eq(second)).toThrow(AmountDecimalsError);
    expect(() => first.gte(second)).toThrow(AmountDecimalsError);
    expect(() => first.lte(second)).toThrow(AmountDecimalsError);
  });

  it("should handle addition with different types correctly", async () => {
    const amount = createAmount(10, 1);
    const otherNumber = 3;
    const otherString = "3";

    expect(amount.plus(otherNumber).value).toEqual(BigInt(130)); // 13.0 represented as 130
    expect(amount.plus(otherString).value).toEqual(BigInt(130)); // 13.0 represented as 130
  });

  it("should handle comparison with different types correctly", async () => {
    const amount = createAmount(10, 1);

    const otherNumber = 15;
    const otherString = "5";

    expect(amount.gt(otherNumber)).toBe(false);
    expect(amount.gt(otherString)).toBe(true);
  });

  describe("convertToRawAmount", () => {
    const validTestCases: [
      number | string | bigint,
      number | undefined,
      RawAmount
    ][] = [
      [100.5, undefined, { value: BigInt(1005), decimals: 1 }],
      [100, undefined, { value: BigInt(100), decimals: 0 }],
      [100.1234, undefined, { value: BigInt(1001234), decimals: 4 }],
      ["100.5", undefined, { value: BigInt(1005), decimals: 1 }],
      ["100", undefined, { value: BigInt(100), decimals: 0 }],
      ["100.1234", undefined, { value: BigInt(1001234), decimals: 4 }],
      [BigInt(100), 2, { value: BigInt(100), decimals: 2 }],
    ];

    it.each(validTestCases)(
      "should correctly convert %s to RawAmount",
      (input, decimals, expectedOutput) => {
        const rawAmount = convertToRawAmount(input, decimals);
        expect(rawAmount).toEqual(expectedOutput);
      }
    );

    const invalidStringTestCases = ["abc", "10.1.2"];
    it.each(invalidStringTestCases)(
      "should throw error for invalid string input '%s'",
      async (num) => {
        expect(() => convertToRawAmount(num)).toThrow(AmountInputError);
      }
    );

    it("should throw error for incompatible decimals", async () => {
      expect(() => convertToRawAmount(BigInt(100), -3)).toThrow(
        AmountDecimalsError
      );
    });

    const invalidDecimalsTestCases = [-1, 80, 1.5];
    it.each(invalidDecimalsTestCases)(
      "should throw error for invalid decimals %s",
      async (decimals) => {
        expect(() => convertToRawAmount(100, decimals)).toThrow(
          AmountDecimalsError
        );
      }
    );
  });
});

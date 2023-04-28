import {
  AmountDecimalsError,
  AmountInputError,
  AmountOutOfRangeError,
  amount,
} from "../client/lib/ft3/asset/amount";
import { DecimalFormat } from "../client/lib/ft3/asset/types";

describe("Asset amount", () => {
  const amounts = [
    [
      amount.create(1, 1),
      amount.create(-25.36, 0),
      amount.create(1e5, 5),
      amount.create(-42.42, 5),
      amount.create(-42.42, 1),
      amount.create(-42.42),
      amount.create(42),
      amount.create(0.13, 4),
      amount.create(0.02, 3),
      amount.create(2, 15),
      amount.create(0xa0, 1),
    ],
    [
      amount.create("1", 1),
      amount.create("-25.36", 0),
      amount.create("100000", 5),
      amount.create("-42.42", 5),
      amount.create("-42.42", 1),
      amount.create("-42.42"),
      amount.create("42"),
      amount.create("0.13", 4),
      amount.create(".02", 3),
      amount.create("2", 15),
      amount.create("160", 1),
    ],
    [
      amount.create(BigInt("10"), 1),
      amount.create(BigInt(-25), 0),
      amount.create(BigInt("10000000000"), 5),
      amount.create(BigInt("-4242000"), 5),
      amount.create(BigInt("-424"), 1),
      amount.create(BigInt("-4242"), 2),
      amount.create(BigInt("0x2a")),
      amount.create(BigInt("1300"), 4),
      amount.create(BigInt("0b10100"), 3),
      amount.create(BigInt("2000000000000000"), 15),
      amount.create(BigInt("0x640"), 1),
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
    expect(numbers.map(amount.stringify)).toEqual([
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
    expect(() => amount.create("something", 1)).toThrow(AmountInputError);
    expect(() => amount.create("1.4.5", 10)).toThrow(AmountInputError);
    expect(() => amount.create("0xaefdaf", 1)).toThrow(AmountInputError);
    expect(() => amount.create("0o167234", 1)).toThrow(AmountInputError);
    expect(() => amount.create("0b011011", 1)).toThrow(AmountInputError);
    expect(() => amount.create(10, -1)).toThrow(AmountDecimalsError);
    expect(() => amount.create(2, 77)).toThrow(AmountOutOfRangeError);
    const outOfBounds = BigInt("0x1" + "0".repeat(64));
    expect(() => amount.create(outOfBounds, 0)).toThrow(AmountOutOfRangeError);
  });

  it("should format correctly in fixedDecimal format", async () => {
    const amounts = [
      amount.create(1234567890, 1),
      amount.create(12.123456789, 20),
      amount.create("1234567890.12345678901", 20),
      amount.create(1.00000000001, 20),
      amount.create("0.00000000001", 20),
      amount.create("10000000000.1", 20),
    ];

    expect(
      amounts.map((num) => num.format(DecimalFormat.fixedDecimals, 4))
    ).toEqual([
      "1 234 567 890",
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
      "1234567890",
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
      amount.create(1234567890, 1),
      amount.create(12.123456789, 20),
      amount.create("11234567890.12345678901", 20),
      amount.create(1.00000000001, 20),
      amount.create("0.00000000001", 20),
      amount.create("10000000000.1", 20),
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
      amount.create(1234567890, 1),
      amount.create(12.123456789, 20),
      amount.create("11234567890.12345678901", 20),
      amount.create(1.00000000001, 20),
      amount.create("0.00000000001", 20),
      amount.create("10000000000.1", 20),
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
    const first = amount.create(100, 0);
    const second = amount.create(10, 0);
    const secondNegative = amount.create(-10, 0);
    const incompatible = amount.create(1000, 1);

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
    const first = amount.create(100, 10);
    const second = amount.create(10, 10);
    const secondNegative = amount.create(-10, 10);
    const incompatible = amount.create(1000, 1);

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
    const first = amount.create(100, 10);
    const firstNegative = amount.create(-100, 10);

    expect(first.times(2).toString()).toEqual("200");
    expect(first.times(-2).toString()).toEqual("-200");
    expect(firstNegative.times(2).toString()).toEqual("-200");
    expect(firstNegative.times(-2).toString()).toEqual("200");
    expect(first.toString()).toEqual("100");
    expect(firstNegative.toString()).toEqual("-100");
  });

  it("should divide correctly", async () => {
    const first = amount.create(100, 0);
    const firstNegative = amount.create(-100, 0);

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
    const first = amount.create(1, 77);
    const firstNegative = amount.create(-1, 77);

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
    const first = amount.create(1, 0);
    const firstNegative = amount.create(-1, 0);
    const second = amount.create(1, 3);
    const secondNegative = amount.create(-1, 3);
    expect(first.dividedBy(3).times(4).toString()).toBe("0");
    expect(firstNegative.dividedBy(3).times(4).toString()).toBe("0");
    expect(second.dividedBy(3).times(4).toString()).toBe("1.332");
    expect(secondNegative.dividedBy(3).times(4).toString()).toBe("-1.332");
  });
});

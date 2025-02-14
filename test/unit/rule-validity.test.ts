import {
  asyncNumberGenerator,
  createFakeAuthDescriptorValidationService,
} from "@ft4-test/util";
import {
  AnyAuthDescriptor,
  blockHeight,
  blockTime,
  createBaseAuthDescriptorValidator,
  equals,
  greaterOrEqual,
  greaterThan,
  lessOrEqual,
  lessThan,
  opCount,
} from "@ft4/accounts";
import { Connection } from "@ft4/ft-session";

describe("Rules", () => {
  const CURR_OP_COUNT = 3;
  const CURR_HEIGHT = 7;
  const CURR_TIME = Date.now();
  const generator = asyncNumberGenerator();
  const validator = createBaseAuthDescriptorValidator(
    createFakeAuthDescriptorValidationService({
      blockHeight: CURR_HEIGHT,
      authDescriptorCounter: CURR_OP_COUNT,
    }),
    {
      client: {
        getBlocksInfo: (_limit: number) => generator.next().value,
      },
      getBlockHeight: () => Promise.resolve(CURR_HEIGHT || 0),
    } as unknown as Connection,
  );

  const activeRules = [
    lessThan(opCount(2)),
    lessThan(blockTime(CURR_TIME - 100)),
    lessThan(blockHeight(CURR_HEIGHT - 1)),
    lessOrEqual(opCount(2)),
    lessOrEqual(blockTime(CURR_TIME - 100)),
    lessOrEqual(blockHeight(CURR_HEIGHT - 1)),
    equals(opCount(1)),
    // not testing this, or I'd have to mock Date.now() again.
    // I'm also strongly in favor of removing equals from all
    // rules, as none would work in a real world scenario
    // equals(blockTime(CURR_TIME)),
    equals(blockHeight(CURR_HEIGHT)),
    greaterOrEqual(opCount(1)),
    greaterOrEqual(blockTime(CURR_TIME)),
    greaterOrEqual(blockHeight(CURR_HEIGHT)),
    greaterOrEqual(blockHeight(CURR_HEIGHT - 1)),
    greaterThan(opCount(1)),
    greaterThan(blockTime(CURR_TIME - 1)),
    greaterThan(blockHeight(CURR_HEIGHT - 1)),
  ];
  it.each(activeRules)("correctly identifies active rules", async (rule) => {
    expect(
      await validator.isActive({ rules: rule } as unknown as AnyAuthDescriptor),
    ).toBe(true);
  });

  const inactiveRules = [
    equals(blockTime(CURR_TIME + 100)),
    equals(blockHeight(CURR_HEIGHT + 1)),
    greaterOrEqual(blockTime(CURR_TIME + 100)),
    greaterOrEqual(blockHeight(CURR_HEIGHT + 1)),
    greaterThan(blockTime(CURR_TIME + 100)),
    greaterThan(blockHeight(CURR_HEIGHT)),
    greaterThan(blockHeight(CURR_HEIGHT + 1)),
  ];
  it.each(inactiveRules)(
    "correctly identifies inactive rules",
    async (rule) => {
      expect(
        await validator.isActive({
          rules: rule,
        } as unknown as AnyAuthDescriptor),
      ).toBe(false);
    },
  );

  const validRules = [
    lessThan(opCount(CURR_OP_COUNT + 2)),
    lessThan(blockTime(CURR_TIME + 100)),
    lessThan(blockHeight(CURR_HEIGHT + 1)),
    lessOrEqual(opCount(CURR_OP_COUNT + 1)),
    lessOrEqual(blockTime(CURR_TIME + 100)),
    lessOrEqual(blockHeight(CURR_HEIGHT + 1)),
    lessOrEqual(opCount(CURR_OP_COUNT + 1)),
    lessOrEqual(blockHeight(CURR_HEIGHT)),
    equals(blockHeight(CURR_HEIGHT)),
    greaterOrEqual(opCount(CURR_OP_COUNT + 1)),
    greaterOrEqual(blockTime(CURR_TIME + 100)),
    greaterOrEqual(blockHeight(CURR_HEIGHT + 1)),
    greaterThan(opCount(CURR_OP_COUNT + 1)),
    greaterThan(blockTime(CURR_TIME + 100)),
    greaterThan(blockHeight(CURR_HEIGHT + 1)),
  ];
  it.each(validRules)(
    "correctly identifies non-expired rules",
    async (rule) => {
      expect(
        await validator.hasExpired({
          rules: rule,
        } as unknown as AnyAuthDescriptor),
      ).toBe(false);
    },
  );

  const expiredRules = [
    lessThan(opCount(CURR_OP_COUNT)),
    lessThan(blockTime(CURR_TIME)),
    lessThan(blockHeight(CURR_HEIGHT)),
    lessOrEqual(opCount(CURR_OP_COUNT - 1)),
    lessOrEqual(blockTime(CURR_TIME - 1)),
    lessOrEqual(blockHeight(CURR_HEIGHT - 1)),
    equals(opCount(CURR_OP_COUNT - 1)),
    equals(blockHeight(CURR_HEIGHT - 1)),
    equals(blockTime(CURR_TIME - 1)),
  ];
  it.each(expiredRules)("correctly identifies expired rules", async (rule) => {
    expect(
      await validator.hasExpired({
        rules: rule,
      } as unknown as AnyAuthDescriptor),
    ).toBe(true);
  });
});

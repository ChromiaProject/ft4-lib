import {
  AnyAuthDescriptor,
  blockHeight,
  blockTime,
  equals,
  greaterOrEqual,
  greaterThan,
  lessOrEqual,
  lessThan,
  opCount,
} from "@ft4/accounts";
import { createBaseAuthDescriptorValidator } from "@ft4/accounts/auth-descriptor/validator/evaluation";
import { createFakeAuthDescriptorValidationService } from "@ft4/util/fake-auth-descriptor-validator";

describe("Rules", () => {
  it("correctly identifies active rules", async () => {
    const CURR_HEIGHT = 7;
    const CURR_TIME = Date.now();

    const validator = createBaseAuthDescriptorValidator(
      createFakeAuthDescriptorValidationService({
        blockHeight: CURR_HEIGHT,
      }),
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

    const results = await Promise.all(
      activeRules.map((r) =>
        validator.isActive({ rules: r } as unknown as AnyAuthDescriptor),
      ),
    );

    expect(results.every(Boolean)).toBe(true);
  });

  it("correctly identifies inactive rules", async () => {
    const CURR_HEIGHT = 7;
    const CURR_TIME = Date.now();

    const validator = createBaseAuthDescriptorValidator(
      createFakeAuthDescriptorValidationService({
        blockHeight: CURR_HEIGHT,
      }),
    );

    const inactiveRules = [
      equals(blockTime(CURR_TIME + 100)),
      equals(blockHeight(CURR_HEIGHT + 1)),
      greaterOrEqual(blockTime(CURR_TIME + 100)),
      greaterOrEqual(blockHeight(CURR_HEIGHT + 1)),
      greaterThan(blockTime(CURR_TIME + 100)),
      greaterThan(blockHeight(CURR_HEIGHT)),
      greaterThan(blockHeight(CURR_HEIGHT + 1)),
    ];

    const results = await Promise.all(
      inactiveRules.map((r) =>
        validator.isActive({ rules: r } as unknown as AnyAuthDescriptor),
      ),
    );

    expect(results.some(Boolean)).toBe(false);
  });

  it("correctly identifies non-expired rules", async () => {
    const CURR_OP_COUNT = 3;
    const CURR_HEIGHT = 7;
    const CURR_TIME = Date.now();

    const validator = createBaseAuthDescriptorValidator(
      createFakeAuthDescriptorValidationService({
        blockHeight: CURR_HEIGHT,
        nonce: CURR_OP_COUNT,
      }),
    );

    const validRules = [
      lessThan(opCount(CURR_OP_COUNT + 1)),
      lessThan(blockTime(CURR_TIME + 100)),
      lessThan(blockHeight(CURR_HEIGHT + 1)),
      lessOrEqual(opCount(CURR_OP_COUNT + 1)),
      lessOrEqual(blockTime(CURR_TIME + 100)),
      lessOrEqual(blockHeight(CURR_HEIGHT + 1)),
      lessOrEqual(opCount(CURR_OP_COUNT)),
      lessOrEqual(blockHeight(CURR_HEIGHT)),
      equals(blockHeight(CURR_HEIGHT)),
      greaterOrEqual(opCount(CURR_OP_COUNT + 1)),
      greaterOrEqual(blockTime(CURR_TIME + 100)),
      greaterOrEqual(blockHeight(CURR_HEIGHT + 1)),
      greaterThan(opCount(CURR_OP_COUNT + 1)),
      greaterThan(blockTime(CURR_TIME + 100)),
      greaterThan(blockHeight(CURR_HEIGHT + 1)),
    ];

    const results = await Promise.all(
      validRules.map((r) =>
        validator.hasExpired({ rules: r } as unknown as AnyAuthDescriptor),
      ),
    );

    expect(results.some(Boolean)).toBe(false);
  });

  it("correctly identifies expired rules", async () => {
    const CURR_OP_COUNT = 3;
    const CURR_HEIGHT = 7;
    const CURR_TIME = Date.now();

    const validator = createBaseAuthDescriptorValidator(
      createFakeAuthDescriptorValidationService({
        blockHeight: CURR_HEIGHT,
      }),
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

    const results = await Promise.all(
      expiredRules.map((r) =>
        validator.hasExpired({ rules: r } as unknown as AnyAuthDescriptor),
      ),
    );

    expect(results.every(Boolean)).toBe(true);
  });
});

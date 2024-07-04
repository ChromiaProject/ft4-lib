import {
  and,
  blockHeight,
  blockTime,
  greaterOrEqual,
  greaterThan,
  lessThan,
  opCount,
} from "@ft4/accounts";
import {
  mapLoginConfigRulesToAuthDescriptorRules,
  relativeBlockHeight,
  relativeBlockTime,
} from "@ft4/authentication";

describe("Login manager", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(1000);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("converts login relative config rules to auth descriptor rules", async () => {
    const loginRule = await mapLoginConfigRulesToAuthDescriptorRules(
      and(
        greaterThan(relativeBlockHeight(100)),
        greaterOrEqual(relativeBlockTime(12)),
      ),
      getFakeBlockHeight(100),
    );

    expect(loginRule).toEqual(
      and(greaterThan(blockHeight(200)), greaterOrEqual(blockTime(1012))),
    );
  });
  it("converts absolute login config to auth descriptor rules", async () => {
    const loginRule = await mapLoginConfigRulesToAuthDescriptorRules(
      and(greaterThan(blockHeight(100)), greaterOrEqual(blockTime(12))),
      getFakeBlockHeight(),
    );

    expect(loginRule).toEqual(
      and(greaterThan(blockHeight(100)), greaterOrEqual(blockTime(12))),
    );
  });
  it("converts mixed login config to auth descriptor rules", async () => {
    const loginRule = await mapLoginConfigRulesToAuthDescriptorRules(
      and(
        lessThan(opCount(5)),
        greaterThan(relativeBlockHeight(100)),
        greaterOrEqual(blockTime(12)),
      ),
      getFakeBlockHeight(200),
    );

    expect(loginRule).toEqual(
      and(
        lessThan(opCount(5)),
        greaterThan(blockHeight(300)),
        greaterOrEqual(blockTime(12)),
      ),
    );
  });
});

function getFakeBlockHeight(height: number = 0): () => Promise<number> {
  return () => {
    return Promise.resolve(height);
  };
}

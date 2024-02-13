import * as ad from "@ft4/accounts/auth-descriptor";
import * as lc from "@ft4/authentication/login-manager/rules";

describe("Login manager", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(1000);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("converts login relative config rules to auth descriptor rules", async () => {
    const loginRule = await lc.mapLoginConfigRulesToAuthDescriptorRules(
      lc.and(
        ad.greaterThan(lc.relativeBlockHeight(100)),
        ad.greaterOrEqual(lc.relativeBlockTime(12)),
      ),
      getFakeBlockHeight(100),
    );

    expect(loginRule).toEqual(
      ad.and(
        ad.greaterThan(ad.blockHeight(200)),
        ad.greaterOrEqual(ad.blockTime(1012)),
      ),
    );
  });
  it("converts absolute login config to auth descriptor rules", async () => {
    const loginRule = await lc.mapLoginConfigRulesToAuthDescriptorRules(
      lc.and(
        ad.greaterThan(lc.blockHeight(100)),
        ad.greaterOrEqual(lc.blockTime(12)),
      ),
      getFakeBlockHeight(),
    );

    expect(loginRule).toEqual(
      ad.and(
        ad.greaterThan(ad.blockHeight(100)),
        ad.greaterOrEqual(ad.blockTime(12)),
      ),
    );
  });
  it("converts mixed login config to auth descriptor rules", async () => {
    const loginRule = await lc.mapLoginConfigRulesToAuthDescriptorRules(
      lc.and(
        ad.lessThan(lc.opCount(5)),
        ad.greaterThan(lc.relativeBlockHeight(100)),
        ad.greaterOrEqual(lc.blockTime(12)),
      ),
      getFakeBlockHeight(200),
    );

    expect(loginRule).toEqual(
      await ad.and(
        ad.lessThan(ad.opCount(5)),
        ad.greaterThan(ad.blockHeight(300)),
        ad.greaterOrEqual(ad.blockTime(12)),
      ),
    );
  });
});

function getFakeBlockHeight(height: number = 0): () => Promise<number> {
  return () => {
    return Promise.resolve(height);
  };
}

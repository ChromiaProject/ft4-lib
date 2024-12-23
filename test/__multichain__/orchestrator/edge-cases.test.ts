import {
  adminUser,
  getNewAsset,
  mapAssetToCrosschainAssetRegistration,
  registerCrosschainAsset,
} from "@ft4-test/util";
import { ASSET_TYPE_FT4, Amount, Asset, createAmount } from "@ft4/asset";
import { Buffer } from "buffer";
import {
  TestContext,
  setupTestEnvironment,
} from "@ft4-test/__multichain__/common-setup";
import { FactoryError, PathfinderError } from "@ft4/crosschain";
import { formatter } from "postchain-client";

describe("Edge Cases", () => {
  const mintAmount = createAmount(100, 0);
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment("edge-cases", mintAmount);
  });

  function testTransfer(
    amount: Amount = createAmount(10, mintAmount.decimals),
    asset: Asset = testContext.sampleAsset,
  ) {
    return testContext.session0.account.crosschainTransfer(
      testContext.multichain2.rid,
      testContext.account2.id,
      asset.id,
      amount,
    );
  }

  function createInvalidAsset(overrides: Partial<Asset>): Asset {
    return {
      id: Buffer.from("invalid-asset"),
      name: "Invalid Asset",
      symbol: "IA",
      decimals: 0,
      blockchainRid: Buffer.from("invalid-blockchain-rid"),
      supply: BigInt(0),
      iconUrl: "",
      type: ASSET_TYPE_FT4,
      ...overrides,
    };
  }

  it("handles invalid amounts", async () => {
    // Test for negative amount
    await expect(testTransfer(createAmount(-10, 1))).rejects.toThrow(
      /value must be non-zero positive/,
    );

    // Test for zero amount
    await expect(testTransfer(createAmount(0, 1))).rejects.toThrow(
      /value must be non-zero positive/,
    );

    // Test for amount larger than asset supply
    await expect(testTransfer(createAmount(1e10, 1))).rejects.toThrow(
      /Balance is too low/,
    );
  });

  it("handles invalid assets", async () => {
    // Test for non-existing asset
    const nonExistingAsset = createInvalidAsset({
      id: Buffer.from("non-existing-asset"),
    });

    await expect(testTransfer(undefined, nonExistingAsset)).rejects.toThrow(
      FactoryError,
    );

    // Test for incompatible asset
    const incompatibleAsset = await getNewAsset(
      testContext.connection0.client,
      "incompatible",
      "INCOMPATIBLE",
    );

    // We created the asset but didn't register it, thus it is incompatible
    await expect(testTransfer(undefined, incompatibleAsset)).rejects.toThrow(
      PathfinderError,
    );
  });

  it("handles missing or invalid parent details", async () => {
    const asset = await getNewAsset(
      testContext.connection0.client,
      "missing_parent",
      "MISSING_PARENT",
    );

    await registerCrosschainAsset(
      testContext.connection2,
      adminUser().signatureProvider,
      mapAssetToCrosschainAssetRegistration(asset),
      formatter.ensureBuffer("aa".repeat(32)),
    );

    await expect(testTransfer(undefined, asset)).rejects.toThrowError(
      PathfinderError,
    );
  });

  it("handles insufficient funds when sending assets back", async () => {
    await testTransfer();

    // Source chain account only has 10 tokens
    await expect(testTransfer(createAmount(20, 1))).rejects.toThrow(
      /Balance is too low/,
    );
  });
});

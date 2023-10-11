import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { Amount } from "/ft4/asset/interfaces";
import { Asset } from "/ft4/asset/types";
import { createAmount, registerCrosschainAsset } from "/ft4";
import adminUser from "/util/admin_user";
import { getNewAsset } from "/util/blockchain-util";

describe("Edge Cases", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
  });

  async function createTestOrchestrator(
    amount: Amount = testContext.sampleAmount,
    asset: Asset = testContext.sampleAsset,
  ) {
    return await createOrchestrator(
      testContext.multichain2.rid,
      testContext.account2.id,
      asset.id,
      amount,
      testContext.session0,
    );
  }

  function createInvalidAsset(overrides: Partial<Asset>): Asset {
    return {
      id: Buffer.from("invalid-asset"),
      name: "Invalid Asset",
      symbol: "IA",
      decimals: 0,
      brid: Buffer.from("invalid-brid"),
      supply: BigInt(0),
      iconUrl: "",
      ...overrides,
    };
  }

  it("handles invalid amounts", async () => {
    const errorListener = jest.fn();

    // Test for negative amount
    const orchestratorNegativeAmount = await createTestOrchestrator(
      createAmount(-10, 1),
    );
    orchestratorNegativeAmount.onTransferError(errorListener);
    await orchestratorNegativeAmount.transfer();
    expect(errorListener).toHaveBeenCalled();

    // Reset errorListener
    errorListener.mockClear();

    // Test for zero amount
    const orchestratorZeroAmount = await createTestOrchestrator(
      createAmount(0, 1),
    );
    orchestratorZeroAmount.onTransferError(errorListener);
    await orchestratorZeroAmount.transfer();
    expect(errorListener).toHaveBeenCalled();

    // Reset errorListener
    errorListener.mockClear();

    // Test for amount larger than asset supply
    const orchestratorLargeAmount = await createTestOrchestrator(
      createAmount(1e10, 1),
    );
    orchestratorLargeAmount.onTransferError(errorListener);
    await orchestratorLargeAmount.transfer();
    expect(errorListener).toHaveBeenCalled();
  });

  it("handles invalid assets", async () => {
    // Test for non-existing asset
    const nonExistingAsset = createInvalidAsset({
      id: Buffer.from("non-existing-asset"),
    });

    await expect(
      createTestOrchestrator(undefined, nonExistingAsset),
    ).rejects.toThrowError("Asset not found");

    // Test for incompatible asset
    const incompatibleAsset = await getNewAsset(testContext.connection0.client);

    // We created the asset but didn't register it, thus it is incompatible
    await expect(
      createTestOrchestrator(undefined, incompatibleAsset),
    ).rejects.toThrowError(/^Path finder error/);
  });

  it("handles missing or invalid parent details", async () => {
    const asset = await getNewAsset(testContext.connection0.client);

    await registerCrosschainAsset(
      testContext.connection2.client,
      adminUser().signatureProvider,
      asset,
      Buffer.from("deadbeef", "hex"),
    );

    await expect(
      createTestOrchestrator(testContext.sampleAmount, asset),
    ).rejects.toThrowError(/^Path finder error/);
  });
});

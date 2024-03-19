import { TestContext, setupTestEnvironment } from "./common-setup";
import { createAmount, registerCrosschainAsset } from "@ft4/index";
import adminUser from "../../../../util/admin_user";

describe("Basic Functionality", () => {
  const mintAmount = createAmount(100, 0);
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment("basic-functionality", mintAmount);
  });

  it("emits events", async () => {
    const signedListener = jest.fn();
    const initListener = jest.fn();
    const hopListener = jest.fn();

    await testContext.account0
      .crosschainTransfer(
        testContext.multichain2.rid,
        testContext.account2.id,
        testContext.sampleAsset.id,
        createAmount(10, mintAmount.decimals),
      )
      .on("signed", signedListener)
      .on("init", initListener)
      .on("hop", hopListener);

    expect(signedListener).toHaveBeenCalledTimes(1);
    expect(initListener).toHaveBeenCalledTimes(1);
    expect(hopListener).toHaveBeenCalledTimes(1);
  });

  it("executes multiple hops transfer", async () => {
    const signedListener = jest.fn();
    const initListener = jest.fn();
    const hopListener = jest.fn();

    await registerCrosschainAsset(
      testContext.connection1.client, // Leaf
      adminUser().signatureProvider,
      testContext.sampleAsset,
      testContext.multichain2.rid, // Branch
    );

    await testContext.account0
      .crosschainTransfer(
        // From root
        testContext.multichain1.rid, // To branch
        testContext.account1.id,
        testContext.sampleAsset.id,
        createAmount(10, mintAmount.decimals),
      )
      .on("signed", signedListener)
      .on("init", initListener)
      .on("hop", hopListener);

    expect(signedListener).toHaveBeenCalledTimes(1);
    expect(initListener).toHaveBeenCalledTimes(1);
    expect(hopListener).toHaveBeenCalledTimes(2);
  });
});

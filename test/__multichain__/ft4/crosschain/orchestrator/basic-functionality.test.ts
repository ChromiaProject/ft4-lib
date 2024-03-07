import { createOrchestrator } from "@ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { createAmount, registerCrosschainAsset } from "@ft4/index";
import adminUser from "../../../../util/admin_user";

describe("Basic Functionality", () => {
  const mintAmount = createAmount(100, 0);
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment("basic-functionality", mintAmount);
  });

  async function createTestOrchestrator() {
    return await createOrchestrator(
      testContext.multichain2.rid,
      testContext.account2.id,
      testContext.sampleAsset.id,
      createAmount(10, mintAmount.decimals),
      testContext.session0,
    );
  }

  it("initializes transfer correctly", async () => {
    const orchestrator = await createTestOrchestrator();

    const initListener = jest.fn();
    orchestrator.onTransferInit(initListener);

    await orchestrator.transfer();

    expect(initListener).toHaveBeenCalled();
  });

  it("emits event when transaction is signed", async () => {
    const orchestrator = await createTestOrchestrator();

    const signedListener = jest.fn();
    orchestrator.onTransferSigned(signedListener);

    await orchestrator.transfer();

    expect(signedListener).toHaveBeenCalled();
  });

  it("executes single hop transfer", async () => {
    const orchestrator = await createTestOrchestrator();

    const hopListener = jest.fn();
    orchestrator.onTransferHop(hopListener);

    await orchestrator.transfer();

    expect(hopListener).toHaveBeenCalledTimes(1);
  });

  it("executes multiple hops transfer", async () => {
    await registerCrosschainAsset(
      testContext.connection1.client, // Leaf
      adminUser().signatureProvider,
      testContext.sampleAsset,
      testContext.multichain2.rid, // Branch
    );

    const orchestrator = await createOrchestrator(
      testContext.multichain1.rid, // To branch
      testContext.account1.id,
      testContext.sampleAsset.id,
      createAmount(10, mintAmount.decimals),
      testContext.session0, // From root
    );

    const hopListener = jest.fn();
    orchestrator.onTransferHop(hopListener);

    await orchestrator.transfer();

    expect(hopListener).toHaveBeenCalledTimes(2);
  });

  it("marks transfer as complete", async () => {
    const orchestrator = await createTestOrchestrator();

    const completeListener = jest.fn();
    orchestrator.onTransferComplete(completeListener);

    await orchestrator.transfer();

    expect(completeListener).toHaveBeenCalled();
  });

  it("ensures no errors are thrown throughout the process", async () => {
    const orchestrator = await createTestOrchestrator();

    const errorListener = jest.fn();

    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).not.toHaveBeenCalled();
  });
});

import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";

describe("Basic Functionality", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
  });

  async function createTestOrchestrator() {
    return await createOrchestrator(
      testContext.multichain2.rid,
      testContext.account2.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
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

  it("executes single hop transfer", async () => {
    const orchestrator = await createTestOrchestrator();

    const hopListener = jest.fn();
    orchestrator.onTransferHop(hopListener);

    await orchestrator.transfer();

    expect(hopListener).toHaveBeenCalledTimes(1);
  });

  it("executes multiple hops transfer", async () => {
    // Implementation here...
  });

  it("marks transfer as complete", async () => {
    const orchestrator = await createTestOrchestrator();

    const endListener = jest.fn();
    orchestrator.onTransferEnd(endListener);

    await orchestrator.transfer();

    expect(endListener).toHaveBeenCalled();
  });

  it.only("ensures no errors are thrown throughout the process", async () => {
    const orchestrator = await createTestOrchestrator();

    const errorListener = jest.fn();

    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).not.toHaveBeenCalled();
  });
});

import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { createAmount } from "/ft4";

describe("Orchestrator", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
  });

  async function createTestOrchestrator() {
    const amount = createAmount(10, 1);

    return await createOrchestrator(
      testContext.multichain2Rid,
      testContext.account2.id,
      testContext.asset.id,
      amount,
      testContext.session0,
    );
  }

  describe("Basic Functionality", () => {
    it("initializes transfer correctly", async () => {
      // Implementation here...
    });

    it("executes single hop transfer", async () => {
      // Implementation here...
    });

    it("executes multiple hops transfer", async () => {
      // Implementation here...
    });

    it("marks transfer as complete", async () => {
      // Implementation here...
    });

    it.only("executes transfer through all paths", async () => {
      const orchestrator = await createTestOrchestrator();

      const initListener = jest.fn();
      const hopListener = jest.fn();
      const endListener = jest.fn();
      const errorListener = jest.fn();

      orchestrator.onTransferInit(initListener);
      orchestrator.onTransferHop(hopListener);
      orchestrator.onTransferEnd(endListener);
      orchestrator.onTransferError(errorListener);

      await orchestrator.transfer();

      expect(initListener).toHaveBeenCalled();
      expect(hopListener).toHaveBeenCalledTimes(1);
      expect(endListener).toHaveBeenCalled();
      expect(errorListener).not.toHaveBeenCalled();
    });
  });
});

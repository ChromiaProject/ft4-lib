import { TestContext, setupTestEnvironment } from "./common-setup";
import { createAmount, createOrchestrator } from "@ft4";
import { createSession } from "@ft4/ft-session";

describe("Error Handling and Recovery", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
  });

  it("emits error event on transfer failure", async () => {
    const mockSession = {
      ...createSession(
        testContext.connection2,
        testContext.account2.authenticator,
      ),
      transactionBuilder: jest.fn().mockImplementation(() => {
        throw new Error("Mocked Error");
      }),
    };

    const orchestrator = await createOrchestrator(
      testContext.multichain0.rid,
      testContext.account0.id,
      testContext.sampleAsset.id,
      createAmount(10, testContext.sampleAsset.decimals),
      mockSession,
    );
    const errorListener = jest.fn();

    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).toHaveBeenCalled();
  });

  it.skip("emits correct error events", async () => {
    // Implementation here...
  });

  it.skip("saves the original exception in the OrchestratorError", async () => {
    // Implementation here...
  });

  it.skip("handles Path finder error", async () => {
    // Implementation here...
  });

  it.skip("handles Postchain client connection issues", async () => {
    // Implementation here...
  });

  it.skip("handles non-existing assets", async () => {
    // Implementation here...
  });
});

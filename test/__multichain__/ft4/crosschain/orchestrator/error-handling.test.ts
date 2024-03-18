import { TestContext, setupTestEnvironment } from "./common-setup";
import { createAmount, createOrchestrator } from "@ft4/index";
import { createAuthenticator } from "@ft4/index";
import { FtKeyStore } from "@ft4/index";
import { createSession } from "@ft4/ft-session";
import { formatter } from "postchain-client";
import { transactionBuilder } from "@ft4/utils/index";
import { createFtKeyHandler } from "@ft4/authentication/index";
import { SigningError } from "@ft4/authentication/index";

describe("Error Handling and Recovery", () => {
  const mintAmount = createAmount(100, 0);
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment("error-handling", mintAmount);
  });

  it("emits error event on signing failure", async () => {
    // Rewire the keystore to let us fake signing failure
    const sign = jest.fn().mockImplementation(() => {
      throw new Error("signing failed");
    });
    const keyStore = {
      ...testContext.account2.authenticator.keyHandlers[0].keyStore,
      sign,
    } as unknown as FtKeyStore;

    const mockSession = {
      ...createSession(
        testContext.connection2,
        testContext.account2.authenticator,
      ),
      transactionBuilder: () =>
        transactionBuilder(
          createAuthenticator(
            testContext.account2.authenticator.accountId,
            [
              createFtKeyHandler(
                testContext.account2.authenticator.keyHandlers[0]
                  .authDescriptor,
                keyStore,
              ),
            ],
            testContext.account2.authenticator.authDataService,
          ),
          testContext.connection2.client,
        ),
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

    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(errorListener.mock.lastCall[0]).toBeInstanceOf(SigningError);
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

  it("handles rejected initTransfer due to zero amount", async () => {
    const orchestrator = await createOrchestrator(
      testContext.multichain2.rid,
      testContext.account2.id,
      testContext.sampleAsset.id,
      createAmount(0, mintAmount.decimals),
      testContext.session0,
    );
    const errorListener = jest.fn();

    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).toHaveBeenCalled();
  });

  it("handles rejected applyTransfer due to non-existing recipientId", async () => {
    const orchestrator = await createOrchestrator(
      testContext.multichain2.rid,
      formatter.toBuffer("00"), // non-existing account
      testContext.sampleAsset.id,
      createAmount(10, mintAmount.decimals),
      testContext.session0,
    );
    const errorListener = jest.fn();

    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).toHaveBeenCalled();
  });

  it.skip("handles non-existing assets", async () => {
    // Implementation here...
  });
});

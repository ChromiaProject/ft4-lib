import { TestContext, setupTestEnvironment } from "./common-setup";
import { formatter } from "postchain-client";
import {
  createAuthenticator,
  createFtKeyHandler,
  FtKeyStore,
  SigningError,
} from "@ft4/authentication";
import { createAuthenticatedAccount } from "@ft4/accounts";
import {
  InitTransferError,
  TransferExecutionError,
} from "@ft4/crosschain/errors";
import { createAmount } from "@ft4/asset";

describe("Error Handling and Recovery", () => {
  const mintAmount = createAmount(100, 0);
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment("error-handling", mintAmount);
  });

  it("rejects on signing failure", async () => {
    // Rewire the keystore to let us fake signing failure
    const sign = jest.fn().mockImplementation(() => {
      throw new Error("signing failed");
    });
    const keyStore = {
      ...testContext.account2.authenticator.keyHandlers[0].keyStore,
      sign,
    } as unknown as FtKeyStore;

    const mockAccount = createAuthenticatedAccount(
      testContext.connection2,
      createAuthenticator(
        testContext.account2.authenticator.accountId,
        [
          createFtKeyHandler(
            testContext.account2.authenticator.keyHandlers[0].authDescriptor,
            keyStore,
          ),
        ],
        testContext.account2.authenticator.authDataService,
      ),
    );

    await expect(
      mockAccount.crosschainTransfer(
        testContext.multichain0.rid,
        testContext.account0.id,
        testContext.sampleAsset.id,
        createAmount(10, testContext.sampleAsset.decimals),
      ),
    ).rejects.toThrow(SigningError);
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

  it("handles rejected init_transfer due to zero amount", async () => {
    await expect(
      testContext.account0.crosschainTransfer(
        testContext.multichain2.rid,
        testContext.account2.id,
        testContext.sampleAsset.id,
        createAmount(0, mintAmount.decimals),
      ),
    ).rejects.toThrow(InitTransferError);
  });

  it("handles rejected applyTransfer due to non-existing recipientId", async () => {
    await expect(
      testContext.account0.crosschainTransfer(
        testContext.multichain2.rid,
        formatter.toBuffer("00"), // non-existing account
        testContext.sampleAsset.id,
        createAmount(10, mintAmount.decimals),
      ),
    ).rejects.toThrow(TransferExecutionError);
  });

  it.skip("handles non-existing assets", async () => {
    // Implementation here...
  });
});

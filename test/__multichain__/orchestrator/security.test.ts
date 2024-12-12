import { createNoopAuthenticator } from "@ft4/authentication";
import { InitTransferError } from "@ft4/crosschain";
import { createAuthDataService } from "@ft4/ft-session";
import { TestContext, setupTestEnvironment } from "@multichain/common-setup";
import { createAuthenticatedAccount } from "@ft4/accounts";
import { createAmount } from "@ft4/asset";

describe("Security", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment("security");
  });

  it("prevents unauthorized transfers", async () => {
    const authDataService = createAuthDataService(testContext.connection0);
    const unauthorizedAuthenticator = createNoopAuthenticator(authDataService);

    const unauthorizedAccount = createAuthenticatedAccount(
      testContext.connection0,
      unauthorizedAuthenticator,
    );

    await expect(
      unauthorizedAccount.crosschainTransfer(
        testContext.multichain2.rid,
        testContext.account2.id,
        testContext.sampleAsset.id,
        createAmount(10, testContext.sampleAsset.decimals),
      ),
    ).rejects.toThrow(InitTransferError);
  });
});

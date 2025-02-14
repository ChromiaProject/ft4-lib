import { TestContext, setupTestEnvironment } from "./common-setup";
import {
  DirectoryNodeUrlPoolException,
  createStubClient,
  formatter,
} from "postchain-client";
import {
  createAuthenticator,
  createFtKeyHandler,
  FtKeyStore,
  SigningError,
} from "@ft4/authentication";
import { createAuthenticatedAccount } from "@ft4/accounts";
import {
  FactoryError,
  InitTransferError,
  TransferExecutionError,
} from "@ft4/crosschain/errors";
import { createAmount } from "@ft4/asset";
import { PathfinderError } from "@ft4/crosschain";

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
        testContext.connection2,
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

  it("saves the original exception in the SigningError", async () => {
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
        testContext.connection2,
      ),
    );

    let failed = false;
    try {
      await mockAccount.crosschainTransfer(
        testContext.multichain0.rid,
        testContext.account0.id,
        testContext.sampleAsset.id,
        createAmount(10, testContext.sampleAsset.decimals),
      );
    } catch (error) {
      failed = true;
      // Check that the error is an instance of SigningError
      expect(error).toBeInstanceOf(SigningError);

      // Check that the original error is preserved within the SigningError
      expect(error.originalError).toBeInstanceOf(Error);
      expect(error.originalError.message).toBe("signing failed");
    }
    expect(failed).toBe(true);
  });

  it("handles Path finder error", async () => {
    const keyStore = testContext.account2.authenticator.keyHandlers[0]
      .keyStore as FtKeyStore;
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
        testContext.connection2,
      ),
    );

    await expect(
      mockAccount.crosschainTransfer(
        testContext.multichain1.rid,
        testContext.account0.id,
        testContext.sampleAsset.id,
        createAmount(10, testContext.sampleAsset.decimals),
      ),
    ).rejects.toBeInstanceOf(PathfinderError);
  });

  it("handles Postchain client connection issues", async () => {
    const keyStore = testContext.account2.authenticator.keyHandlers[0]
      .keyStore as FtKeyStore;

    const mockConnection = {
      ...testContext.connection2,
      client: await createStubClient(),
    };
    const mockAccount = createAuthenticatedAccount(
      mockConnection,
      createAuthenticator(
        testContext.account2.authenticator.accountId,
        [
          createFtKeyHandler(
            testContext.account2.authenticator.keyHandlers[0].authDescriptor,
            keyStore,
          ),
        ],
        testContext.account2.authenticator.authDataService,
        mockConnection,
      ),
    );

    await expect(
      mockAccount.crosschainTransfer(
        testContext.multichain1.rid,
        testContext.account0.id,
        testContext.sampleAsset.id,
        createAmount(10, testContext.sampleAsset.decimals),
      ),
    ).rejects.toBeInstanceOf(DirectoryNodeUrlPoolException);
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

  it("handles non-existing assets", async () => {
    let failed = false;
    try {
      await testContext.account0.crosschainTransfer(
        testContext.multichain2.rid,
        testContext.account0.id,
        Buffer.alloc(32), // Non existing asset
        createAmount(10, mintAmount.decimals),
      );
    } catch (error) {
      failed = true;
      expect(error).toBeInstanceOf(FactoryError);
      expect(error.message).toBe("The specified asset could not be found");
    }
    expect(failed).toBe(true);
  });
});

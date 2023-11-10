import { TestContext, setupTestEnvironment } from "./common-setup";
import {
  Session,
  createAmount,
  createOrchestrator,
} from "../../../../../client/lib/ft4";
import { createNoopAuthenticator } from "../../../../../client/lib/ft4/authentication";
import { InitTransferError } from "../../../../../client/lib/ft4/crosschain/errors";
import {
  createAuthDataService,
  createSession,
} from "../../../../../client/lib/ft4/ft-session";

describe("Security", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
  });

  async function createTestOrchestrator(
    session: Session = testContext.session0,
  ) {
    return await createOrchestrator(
      testContext.multichain2.rid,
      testContext.account2.id,
      testContext.sampleAsset.id,
      createAmount(10, testContext.sampleAsset.decimals),
      session,
    );
  }

  it("prevents unauthorized transfers", async () => {
    const authDataService = createAuthDataService(testContext.connection0);
    const unauthorizedAuthenticator = createNoopAuthenticator(authDataService);

    const unauthorizedSession = createSession(
      testContext.connection0,
      unauthorizedAuthenticator,
    );
    const orchestrator = await createTestOrchestrator(unauthorizedSession);

    const errorListener = jest.fn();
    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).toHaveBeenCalled();

    expect(errorListener.mock.calls[0][0]).toBeInstanceOf(InitTransferError);
    expect(errorListener.mock.calls[0][0].message).toMatch(
      /^Failed to send transaction/i,
    );
  });
});

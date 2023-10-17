import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { createAmount, Orchestrator, registerCrosschainAsset } from "/ft4";
import { Amount } from "/ft4/asset/interfaces";
import adminUser from "/util/admin_user";

// This is needed to allow to check whether transaction is anchored
jest.unmock("postchain-client");

describe("Asset Hierarchy", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
  });

  async function verifyEndTransferAndBalances(
    orchestrator: Orchestrator,
    expectedBalances: { [key: number]: Amount | undefined },
  ) {
    const endListener = jest.fn();
    orchestrator.onTransferEnd(endListener);

    await orchestrator.transfer();

    expect(endListener).toHaveBeenCalled();

    for (const [accountNum, expectedBalance] of Object.entries(
      expectedBalances,
    )) {
      if (expectedBalance !== undefined) {
        const actualBalance = await testContext[
          `account${accountNum}`
        ].getBalanceByAssetId(testContext.sampleAsset.id);

        expect(actualBalance.amount.toString()).toEqual(
          expectedBalance.toString(),
        );
      }
    }
  }

  it("transfers from root to leaf and back", async () => {
    await registerCrosschainAsset(
      testContext.connection1.client, // Leaf
      adminUser().signatureProvider,
      testContext.sampleAsset,
      testContext.multichain2.rid, // Branch
    );

    const orchestratorFromRootToLeaf = await createOrchestrator(
      testContext.multichain1.rid, // To leaf
      testContext.account1.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session0, // From root
    );

    const { decimals } = testContext.sampleAsset;

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {
      0: createAmount(90, decimals),
      1: createAmount(10, decimals),
    });

    const orchestratorFromLeafToRoot = await createOrchestrator(
      testContext.multichain0.rid, // To root
      testContext.account0.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session1, // From leaf
    );

    await verifyEndTransferAndBalances(orchestratorFromLeafToRoot, {
      0: createAmount(100, decimals),
      1: createAmount(0, decimals),
    });
  });

  it("transfers from leaf to sibling", async () => {
    await registerCrosschainAsset(
      testContext.connection1.client, // Leaf
      adminUser().signatureProvider,
      testContext.sampleAsset,
      testContext.multichain0.rid, // Root
    );

    const orchestratorFromRootToLeaf = await createOrchestrator(
      testContext.multichain2.rid, // To leaf
      testContext.account2.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session0, // From root
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {});

    const orchestratorFromLeafToSibling = await createOrchestrator(
      testContext.multichain1.rid, // To sibling
      testContext.account1.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session2, // From leaf
    );

    const { decimals } = testContext.sampleAsset;

    await verifyEndTransferAndBalances(orchestratorFromLeafToSibling, {
      0: createAmount(90, decimals),
      1: createAmount(10, decimals),
      2: createAmount(0, decimals),
    });
  });

  it("transfers from leaf to branch", async () => {
    await registerCrosschainAsset(
      testContext.connection1.client, // Leaf
      adminUser().signatureProvider,
      testContext.sampleAsset,
      testContext.multichain2.rid, // Branch
    );

    const orchestratorFromRootToLeaf = await createOrchestrator(
      testContext.multichain1.rid, // To leaf
      testContext.account1.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session0, // From root
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {});

    const orchestratorFromLeafToBranch = await createOrchestrator(
      testContext.multichain2.rid, // To branch
      testContext.account2.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session1, // From leaf
    );

    const { decimals } = testContext.sampleAsset;

    await verifyEndTransferAndBalances(orchestratorFromLeafToBranch, {
      0: createAmount(90, decimals),
      1: createAmount(0, decimals),
      2: createAmount(10, decimals),
    });
  });

  it("transfers from branch to leaf", async () => {
    await registerCrosschainAsset(
      testContext.connection1.client, // Leaf
      adminUser().signatureProvider,
      testContext.sampleAsset,
      testContext.multichain2.rid, // Branch
    );

    const orchestratorFromRootToBranch = await createOrchestrator(
      testContext.multichain2.rid, // To branch
      testContext.account2.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session0, // From root
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToBranch, {});

    const orchestratorFromBranchToLeaf = await createOrchestrator(
      testContext.multichain1.rid, // To leaf
      testContext.account1.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session2, // From branch
    );

    const { decimals } = testContext.sampleAsset;

    await verifyEndTransferAndBalances(orchestratorFromBranchToLeaf, {
      0: createAmount(90, decimals),
      1: createAmount(10, decimals),
      2: createAmount(0, decimals),
    });
  });
});

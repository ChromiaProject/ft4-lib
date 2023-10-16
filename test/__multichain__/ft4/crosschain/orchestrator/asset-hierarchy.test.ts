import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { createAmount, Orchestrator, registerCrosschainAsset } from "/ft4";
import { Amount } from "/ft4/asset/interfaces";
import adminUser from "/util/admin_user";

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
        ].getBalanceByAssetId(testContext.sampleAsset);
        expect(actualBalance.amount).toEqual(expectedBalance);
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

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {
      0: createAmount(90, 1),
      1: createAmount(10, 1),
    });

    const orchestratorFromLeafToRoot = await createOrchestrator(
      testContext.multichain0.rid, // To root
      testContext.account0.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session1, // From leaf
    );

    await verifyEndTransferAndBalances(orchestratorFromLeafToRoot, {});
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

    await verifyEndTransferAndBalances(orchestratorFromLeafToSibling, {});
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

    await verifyEndTransferAndBalances(orchestratorFromLeafToBranch, {});
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

    await verifyEndTransferAndBalances(orchestratorFromBranchToLeaf, {});
  });
});

import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { Orchestrator, registerCrosschainAsset } from "/ft4";
import adminUser from "/util/admin_user";

describe("Asset Hierarchy", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
  });

  async function verifyEndTransfer(orchestrator: Orchestrator) {
    const endListener = jest.fn();
    orchestrator.onTransferEnd(endListener);

    await orchestrator.transfer();

    expect(endListener).toHaveBeenCalled();
  }

  it("transfers from root to leaf and back", async () => {
    const orchestratorFromRootToLeaf = await createOrchestrator(
      testContext.multichain2.rid, // To leaf
      testContext.account2.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session0, // From root
    );

    await verifyEndTransfer(orchestratorFromRootToLeaf);

    const orchestratorFromLeafToRoot = await createOrchestrator(
      testContext.multichain0.rid, // To root
      testContext.account0.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session2, // From leaf
    );

    await verifyEndTransfer(orchestratorFromLeafToRoot);
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

    await verifyEndTransfer(orchestratorFromRootToLeaf);

    const orchestratorFromLeafToSibling = await createOrchestrator(
      testContext.multichain1.rid, // To sibling
      testContext.account1.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session2, // From leaf
    );

    await verifyEndTransfer(orchestratorFromLeafToSibling);
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

    await verifyEndTransfer(orchestratorFromRootToLeaf);

    const orchestratorFromLeafToBranch = await createOrchestrator(
      testContext.multichain2.rid, // To branch
      testContext.account2.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session1, // From leaf
    );

    await verifyEndTransfer(orchestratorFromLeafToBranch);
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

    await verifyEndTransfer(orchestratorFromRootToBranch);

    const orchestratorFromBranchToLeaf = await createOrchestrator(
      testContext.multichain1.rid, // To leaf
      testContext.account1.id,
      testContext.sampleAsset.id,
      testContext.sampleAmount,
      testContext.session2, // From branch
    );

    await verifyEndTransfer(orchestratorFromBranchToLeaf);
  });
});

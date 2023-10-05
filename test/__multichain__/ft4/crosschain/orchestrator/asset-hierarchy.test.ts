import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { Orchestrator, registerCrosschainAsset } from "/ft4";
import { getNewAsset } from "/util/blockchain-util";
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

  it("transfers from root to leaf", async () => {
    // Root asset
    const asset = await getNewAsset(testContext.connection0.client);

    await registerCrosschainAsset(
      testContext.connection2.client, // Leaf
      adminUser().signatureProvider,
      asset,
      testContext.multichain0.rid, // Root
    );

    const orchestrator = await createOrchestrator(
      testContext.multichain2.rid, // To leaf
      testContext.account2.id,
      asset.id,
      testContext.sampleAmount,
      testContext.session0, // From root
    );

    verifyEndTransfer(orchestrator);
  });

  it("transfers from leaf to root", async () => {
    // Root asset
    const asset = await getNewAsset(testContext.connection0.client);

    await registerCrosschainAsset(
      testContext.connection2.client, // Leaf
      adminUser().signatureProvider,
      asset,
      testContext.multichain0.rid, // Root
    );

    const orchestrator = await createOrchestrator(
      testContext.multichain0.rid, // To root
      testContext.account0.id,
      asset.id,
      testContext.sampleAmount,
      testContext.session2, // From leaf
    );

    verifyEndTransfer(orchestrator);
  });

  it("transfers from leaf to sibling", async () => {
    // Leaf asset
    const asset = await getNewAsset(testContext.connection2.client);

    await registerCrosschainAsset(
      testContext.connection2.client, // Leaf
      adminUser().signatureProvider,
      asset,
      testContext.multichain0.rid, // Root
    );

    await registerCrosschainAsset(
      testContext.connection1.client, // Sibling
      adminUser().signatureProvider,
      asset,
      testContext.multichain0.rid, // Root
    );

    const orchestrator = await createOrchestrator(
      testContext.multichain1.rid, // To sibling
      testContext.account1.id,
      asset.id,
      testContext.sampleAmount,
      testContext.session2, // From leaf
    );

    verifyEndTransfer(orchestrator);
  });

  it("transfers from leaf to branch", async () => {
    // Branch asset
    const asset = await getNewAsset(testContext.connection1.client);

    await registerCrosschainAsset(
      testContext.connection1.client, // Branch
      adminUser().signatureProvider,
      asset,
      testContext.multichain0.rid, // Root
    );

    await registerCrosschainAsset(
      testContext.connection2.client, // Leaf
      adminUser().signatureProvider,
      asset,
      testContext.multichain1.rid, // Branch
    );

    const orchestrator = await createOrchestrator(
      testContext.multichain1.rid, // To branch
      testContext.account1.id,
      asset.id,
      testContext.sampleAmount,
      testContext.session2, // From leaf
    );

    verifyEndTransfer(orchestrator);
  });

  it("transfers from branch to leaf", async () => {
    // Leaf asset
    const asset = await getNewAsset(testContext.connection2.client);

    await registerCrosschainAsset(
      testContext.connection1.client, // Branch
      adminUser().signatureProvider,
      asset,
      testContext.multichain0.rid, // Root
    );

    await registerCrosschainAsset(
      testContext.connection2.client, // Leaf
      adminUser().signatureProvider,
      asset,
      testContext.multichain1.rid, // Branch
    );

    const orchestrator = await createOrchestrator(
      testContext.multichain2.rid, // To leaf
      testContext.account1.id,
      asset.id,
      testContext.sampleAmount,
      testContext.session1, // From branch
    );

    verifyEndTransfer(orchestrator);
  });
});

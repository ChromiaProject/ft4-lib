import { createOrchestrator } from "@ft4/crosschain/orchestrator";
import { TestContext, setupTestEnvironment } from "./common-setup";
import {
  createAmount,
  Orchestrator,
  registerCrosschainAsset,
} from "@ft4/index";
import { Amount } from "@ft4/asset";
import adminUser from "../../../../util/admin_user";

describe("Asset Hierarchy", () => {
  const mintAmount = createAmount(100, 0);
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment("asset-hierarchy", mintAmount);
  });

  async function verifyEndTransferAndBalances(
    orchestrator: Orchestrator,
    expectedBalances: { [key: number]: Amount | undefined },
  ) {
    const completedListener = jest.fn();
    orchestrator.onTransferComplete(completedListener);
    const errorListener = jest.fn();
    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).not.toHaveBeenCalled();
    expect(completedListener).toHaveBeenCalled();

    for (const [accountNum, expectedBalance] of Object.entries(
      expectedBalances,
    )) {
      if (expectedBalance !== undefined) {
        const actualBalance = await testContext[
          `account${accountNum}`
        ].getBalanceByAssetId(testContext.sampleAsset.id);

        expect(
          (
            actualBalance?.amount || createAmount(0, expectedBalance.decimals)
          ).toString(),
        ).toEqual(expectedBalance.toString());
      }
    }
  }

  it("transfers from root to leaf and back", async () => {
    const { decimals } = mintAmount;

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
      createAmount(10, decimals),
      testContext.session0, // From root
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {
      0: createAmount(90, decimals),
      1: createAmount(10, decimals),
    });

    const orchestratorFromLeafToRoot = await createOrchestrator(
      testContext.multichain0.rid, // To root
      testContext.account0.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
      testContext.session1, // From leaf
    );

    await verifyEndTransferAndBalances(orchestratorFromLeafToRoot, {
      0: createAmount(100, decimals),
      1: createAmount(0, decimals),
    });
  });

  it("transfers from leaf to sibling", async () => {
    const { decimals } = mintAmount;

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
      createAmount(10, decimals),
      testContext.session0, // From root
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {});

    const orchestratorFromLeafToSibling = await createOrchestrator(
      testContext.multichain1.rid, // To sibling
      testContext.account1.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
      testContext.session2, // From leaf
    );

    await verifyEndTransferAndBalances(orchestratorFromLeafToSibling, {
      0: createAmount(90, decimals),
      1: createAmount(10, decimals),
      2: createAmount(0, decimals),
    });
  });

  it("transfers from leaf to branch", async () => {
    const { decimals } = mintAmount;

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
      createAmount(10, decimals),
      testContext.session0, // From root
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {});

    const orchestratorFromLeafToBranch = await createOrchestrator(
      testContext.multichain2.rid, // To branch
      testContext.account2.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
      testContext.session1, // From leaf
    );

    await verifyEndTransferAndBalances(orchestratorFromLeafToBranch, {
      0: createAmount(90, decimals),
      1: createAmount(0, decimals),
      2: createAmount(10, decimals),
    });
  });

  it("transfers from branch to leaf", async () => {
    const { decimals } = mintAmount;

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
      createAmount(10, decimals),
      testContext.session0, // From root
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToBranch, {});

    const orchestratorFromBranchToLeaf = await createOrchestrator(
      testContext.multichain1.rid, // To leaf
      testContext.account1.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
      testContext.session2, // From branch
    );

    await verifyEndTransferAndBalances(orchestratorFromBranchToLeaf, {
      0: createAmount(90, decimals),
      1: createAmount(10, decimals),
      2: createAmount(0, decimals),
    });
  });
});

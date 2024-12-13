import { Orchestrator, createOrchestrator } from "@ft4/crosschain";
import {
  TestContext,
  setupTestEnvironment,
} from "@ft4-test/__multichain__/common-setup";
import { Amount, createAmount } from "@ft4/asset";
import { adminUser } from "@ft4-test/util";
import { registerCrosschainAsset } from "@ft4/admin";

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
    await orchestrator.transfer();

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
      testContext.sampleAsset.id,
      testContext.multichain2.rid, // Branch
    );

    const orchestratorFromRootToLeaf = await createOrchestrator(
      testContext.session0, // From root
      testContext.session0.account.authenticator,
      testContext.multichain1.rid, // To leaf
      testContext.account1.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {
      0: createAmount(90, decimals),
      1: createAmount(10, decimals),
    });

    const orchestratorFromLeafToRoot = await createOrchestrator(
      testContext.session1, // From leaf
      testContext.session1.account.authenticator,
      testContext.multichain0.rid, // To root
      testContext.account0.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
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
      testContext.sampleAsset.id,
      testContext.multichain0.rid, // Root
    );

    const orchestratorFromRootToLeaf = await createOrchestrator(
      testContext.session0, // From root
      testContext.session0.account.authenticator,
      testContext.multichain2.rid, // To leaf
      testContext.account2.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {});

    const orchestratorFromLeafToSibling = await createOrchestrator(
      testContext.session2, // From root
      testContext.session2.account.authenticator,
      testContext.multichain1.rid, // To sibling
      testContext.account1.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
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
      testContext.sampleAsset.id,
      testContext.multichain2.rid, // Branch
    );

    const orchestratorFromRootToLeaf = await createOrchestrator(
      testContext.session0, // From root
      testContext.session0.account.authenticator,
      testContext.multichain1.rid, // To leaf
      testContext.account1.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToLeaf, {});

    const orchestratorFromLeafToBranch = await createOrchestrator(
      testContext.session1, // From root
      testContext.session1.account.authenticator,
      testContext.multichain2.rid, // To branch
      testContext.account2.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
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
      testContext.sampleAsset.id,
      testContext.multichain2.rid, // Branch
    );

    const orchestratorFromRootToBranch = await createOrchestrator(
      testContext.session0, // From root
      testContext.session0.account.authenticator,
      testContext.multichain2.rid, // To branch
      testContext.account2.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
    );

    await verifyEndTransferAndBalances(orchestratorFromRootToBranch, {});

    const orchestratorFromBranchToLeaf = await createOrchestrator(
      testContext.session2, // From root
      testContext.session2.account.authenticator,
      testContext.multichain1.rid, // To leaf
      testContext.account1.id,
      testContext.sampleAsset.id,
      createAmount(10, decimals),
    );

    await verifyEndTransferAndBalances(orchestratorFromBranchToLeaf, {
      0: createAmount(90, decimals),
      1: createAmount(10, decimals),
      2: createAmount(0, decimals),
    });
  });
});

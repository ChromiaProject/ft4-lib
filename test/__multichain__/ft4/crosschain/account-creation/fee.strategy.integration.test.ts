import { registerAccount } from "@ft4/accounts/registration";
import {
  FtKeyStore,
  createInMemoryFtKeyStore,
  createSingleSigAuthDescriptorRegistration,
  registerCrosschainAsset,
} from "@ft4/index";
import { Asset } from "@ft4/index";
import { gtv, newSignatureProvider } from "postchain-client";
import { getNewAsset } from "@ft4/util/blockchain-util";
import { pendingTransferStrategies } from "@ft4/accounts/registration/strategies/transfer/queries";
import { fee } from "@ft4/accounts/registration/strategies/fee";
import { feeAssets } from "@ft4/accounts/registration/strategies/transfer/fee/queries";
import { allowedAssets } from "@ft4/accounts/registration/strategies/transfer/queries";
import { createAmountFromBalance } from "@ft4/index";
import {
  TestContext,
  setupTestEnvironment,
} from "../orchestrator/common-setup";
import adminUser from "@ft4/util/admin_user";
import { open } from "@ft4/accounts/registration/strategies/open";

let asset: Asset;

// This is needed to allow to check whether transaction is anchored
jest.unmock("postchain-client");

describe("Fee account creation single step", () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
    asset = await getNewAsset(
      testContext.connection0.client,
      "fee_strategy_test_asset_00",
      "FEE_STRATEGY_TEST_ASSET_00",
      5,
    );
    await registerCrosschainAsset(
      testContext.connection1.client,
      adminUser().signatureProvider,
      asset,
      testContext.multichain0.rid,
    );
  });

  it("can register account which receives transferred assets, minus fee", async () => {
    const { connection0: senderConnection, connection1: recipientConnection } =
      testContext;

    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { account } = await registerAccount(
      senderConnection,
      keyStore,
      open(authDescriptor),
    );

    const recipientId = gtv.gtvHash((await account.getAuthDescriptors())[0].id);

    const _allowedAssets = (await recipientConnection.query(
      allowedAssets(senderConnection.blockchainRid, account.id, recipientId),
    ))!;

    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find((v) => v.asset_id === asset.id)
      ?.min_amount;

    expect(rawAmount).toEqual(1000000n);

    const _feeAssets = await recipientConnection.query(feeAssets());
    expect(_feeAssets).toBeTruthy();
    const feeRawAmount = _feeAssets.find((v) => v.asset_id === asset.id)
      ?.amount;

    expect(feeRawAmount).toEqual(1000000n);

    const amount = createAmountFromBalance(rawAmount!, asset.decimals);

    const session = await registerAccount(
      recipientConnection,
      keyStore as FtKeyStore,
      fee(senderConnection.blockchainRid, asset, authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.value).toBe(
      amount.value - _feeAssets[0].amount,
    );

    expect(
      await recipientConnection.query(pendingTransferStrategies(recipientId)),
    ).toBe([]);
  });
});

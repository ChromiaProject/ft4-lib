import { registerAccount } from "@ft4/accounts/registration";
import {
  Connection,
  FtKeyStore,
  createAmount,
  createConnection,
  createInMemoryFtKeyStore,
  createSingleSigAuthDescriptorRegistration,
  mint,
  registerCrosschainAsset,
} from "@ft4/index";
import { Asset } from "@ft4/index";
import { gtv, newSignatureProvider } from "postchain-client";
import {
  createChromiaClientToMultichain,
  getNewAsset,
} from "@ft4/util/blockchain-util";
import { pendingTransferStrategies } from "@ft4/accounts/registration/strategies/transfer/queries";
import { fee } from "@ft4/accounts/registration/strategies/fee";
import { feeAssets } from "@ft4/accounts/registration/strategies/transfer/fee/queries";
import { allowedAssets } from "@ft4/accounts/registration/strategies/transfer/queries";
import adminUser from "@ft4/util/admin_user";
import { open } from "@ft4/accounts/registration/strategies/open";
import { fetchBlockchains } from "@ft4/__multichain__/util/blockchain";

let asset: Asset;
let senderConnection: Connection;
let recipientConnection: Connection;

// This is needed to allow to check whether transaction is anchored
jest.unmock("postchain-client");

describe("Fee account creation single step", () => {
  beforeAll(async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();
    senderConnection = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    recipientConnection = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );

    asset = await getNewAsset(
      senderConnection.client,
      "fee_strategy_test_asset_00",
      "FEE_STRATEGY_TEST_ASSET_00",
      5,
    );
    await registerCrosschainAsset(
      recipientConnection.client,
      adminUser().signatureProvider,
      asset,
      multichain00.rid,
    );
  });

  it("can register account which receives transferred assets, minus fee", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { account: senderAccount } = await registerAccount(
      senderConnection,
      keyStore,
      open(authDescriptor),
    );

    const startingAmount = createAmount(20, 5);
    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      createAmount(20, 5),
    );

    const recipientId = gtv.gtvHash(sigProv.pubKey);
    expect(senderAccount.id).toEqual(recipientId);

    const _allowedAssets = (await recipientConnection.query(
      allowedAssets(
        senderConnection.blockchainRid,
        senderAccount.id,
        recipientId,
      ),
    ))!;

    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find(
      (v) => v.asset_id.compare(asset.id) === 0,
    )?.min_amount;

    const _feeAssets = await recipientConnection.query(feeAssets());
    expect(_feeAssets).toBeTruthy();
    const feeRawAmount = _feeAssets.find(
      (v) => v.asset_id.compare(asset.id) === 0,
    )?.amount;

    expect(rawAmount).toEqual(1000000n);
    expect(feeRawAmount).toEqual(1000000n);

    const recipientSession = await registerAccount(
      recipientConnection,
      keyStore as FtKeyStore,
      fee(senderConnection.blockchainRid, asset, authDescriptor),
    );

    expect(recipientSession.account.id).toEqual(recipientId);

    const assetBalanceRecipient =
      await recipientSession.account.getBalanceByAssetId(asset.id);
    expect(assetBalanceRecipient).toBe(null);

    const assetBalanceSender = await senderAccount.getBalanceByAssetId(
      asset.id,
    );
    expect(assetBalanceSender!.amount.value).toBe(
      startingAmount.value - feeRawAmount!,
    );

    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);
  });
});

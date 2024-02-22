import { registerAccount } from "@ft4/accounts/registration";
import {
  Connection,
  createAmount,
  createConnection,
  createInMemoryFtKeyStore,
  createOrchestrator,
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
let missingAsset: Asset;
let senderConnection: Connection;
let recipientConnection: Connection;
let unrelatedConnection: Connection;

// This is needed to allow to check whether transaction is anchored
jest.unmock("postchain-client");

describe("Fee account creation single step", () => {
  beforeAll(async () => {
    const { multichain00, multichain01, multichain02 } =
      await fetchBlockchains();
    senderConnection = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    recipientConnection = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );
    unrelatedConnection = createConnection(
      await createChromiaClientToMultichain(multichain02.rid),
    );

    asset = await getNewAsset(
      senderConnection.client,
      "fee_strategy_test_asset_00",
      "FEE_STRATEGY_TEST_ASSET_00",
      5,
    );

    // based on the assumption that asset ID is:
    // (name, blockchain_rid).hash()
    const missingAssetId = gtv.gtvHash([
      "fee_strategy_missing_test_asset_00",
      multichain00.rid,
    ]);

    missingAsset = {
      id: missingAssetId,
      name: "fee_strategy_missing_test_asset_00",
      symbol: "fee_strategy_missing_test_asset_00",
      decimals: 5,
      blockchainRid: multichain00.rid,
      supply: 10000n,
      iconUrl: "https://missing.asset",
    };
    await registerCrosschainAsset(
      recipientConnection.client,
      adminUser().signatureProvider,
      asset,
      multichain00.rid,
    );
    await registerCrosschainAsset(
      recipientConnection.client,
      adminUser().signatureProvider,
      missingAsset,
      multichain00.rid,
    );
    await registerCrosschainAsset(
      unrelatedConnection.client,
      adminUser().signatureProvider,
      asset,
      multichain01.rid,
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
      startingAmount,
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
      keyStore,
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

  it("handles asset coming from wrong chain properly", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { account: unrelatedAccount } = await registerAccount(
      unrelatedConnection,
      keyStore,
      open(authDescriptor),
    );

    const senderSession = await registerAccount(
      senderConnection,
      keyStore,
      open(authDescriptor),
    );

    const startingAmount = createAmount(20, 5);
    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderSession.account.id,
      asset.id,
      startingAmount,
    );

    const orchestrator = await createOrchestrator(
      unrelatedConnection.client.config.blockchainRid + "",
      unrelatedAccount.id,
      asset.id,
      startingAmount,
      senderSession,
    );
    orchestrator.onTransferError((e) => {
      throw e;
    });
    await orchestrator.transfer();

    const recipientId = gtv.gtvHash(sigProv.pubKey);
    expect(unrelatedAccount.id).toEqual(recipientId);

    const _allowedAssets = (await recipientConnection.query(
      allowedAssets(
        unrelatedConnection.blockchainRid,
        unrelatedAccount.id,
        recipientId,
      ),
    ))!;

    expect(_allowedAssets.length).toBe(0);

    const _feeAssets = await recipientConnection.query(feeAssets());
    expect(_feeAssets).toBeTruthy();

    const recipientSessionPromise = registerAccount(
      recipientConnection,
      keyStore,
      fee(unrelatedConnection.blockchainRid, asset, authDescriptor),
    );

    await expect(recipientSessionPromise).rejects.toThrow();

    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);
    expect(await recipientConnection.getAccountById(recipientId)).toBeNull();
  });

  it("handles asset missing on source chain properly", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    await registerAccount(senderConnection, keyStore, open(authDescriptor));

    const recipientId = gtv.gtvHash(sigProv.pubKey);

    const recipientSessionPromise = registerAccount(
      recipientConnection,
      keyStore,
      fee(senderConnection.blockchainRid, missingAsset, authDescriptor),
    );

    await expect(recipientSessionPromise).rejects.toThrow(
      "The specified asset could not be found",
    );

    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);
    expect(await recipientConnection.getAccountById(recipientId)).toBeNull();
  });

  it("handles missing account on source chain properly", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const recipientId = gtv.gtvHash(sigProv.pubKey);

    const recipientSessionPromise = registerAccount(
      recipientConnection,
      keyStore,
      fee(senderConnection.blockchainRid, asset, authDescriptor),
    );

    // originalError:  No key handler registered to handle operation <ft4.crosschain.init_transfer>
    await expect(recipientSessionPromise).rejects.toThrow();

    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);
    expect(await recipientConnection.getAccountById(recipientId)).toBeNull();
  });

  it("handles insufficient balance on source chain properly", async () => {
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

    const startingAmount = createAmount(0.01, 5);
    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      startingAmount,
    );

    const recipientId = gtv.gtvHash(sigProv.pubKey);

    const recipientSessionPromise = registerAccount(
      recipientConnection,
      keyStore,
      fee(senderConnection.blockchainRid, asset, authDescriptor),
    );

    // originalError: balance is too low
    await expect(recipientSessionPromise).rejects.toThrow();

    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);
    expect(await recipientConnection.getAccountById(recipientId)).toBeNull();
  });
});

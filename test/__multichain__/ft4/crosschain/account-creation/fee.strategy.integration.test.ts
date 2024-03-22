import { registerAccount } from "@ft4/accounts/registration";
import {
  Connection,
  createAmount,
  createAmountFromBalance,
  createConnection,
  createInMemoryFtKeyStore,
  createSingleSigAuthDescriptorRegistration,
  mint,
  registerCrosschainAsset,
} from "@ft4/index";
import { Asset } from "@ft4/index";
import { encryption, gtv, newSignatureProvider } from "postchain-client";
import {
  createChromiaClientToMultichain,
  getNewAsset,
} from "@ft4/util/blockchain-util";
import { pendingTransferStrategies } from "@ft4/accounts/registration/strategies/transfer/queries";
import { open } from "@ft4/accounts/registration/strategies/open";
import { fee } from "@ft4/accounts/registration/strategies/fee";
import { feeAssets } from "@ft4/accounts/registration/strategies/transfer/fee/queries";
import { allowedAssets } from "@ft4/accounts/registration/strategies/transfer/queries";
import adminUser from "@ft4/util/admin_user";
import { fetchBlockchains } from "@ft4/__multichain__/util/blockchain";
import { initTransfer } from "@ft4/crosschain/operations";
import { ASSET_TYPE_FT4 } from "@ft4/asset/types";

let asset: Asset;
let nonExistentChain00Asset: Asset;
let senderConnection: Connection;
let recipientConnection: Connection;
let unrelatedConnection: Connection;

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

    nonExistentChain00Asset = {
      id: missingAssetId,
      name: "fee_strategy_missing_test_asset_00",
      symbol: "fee_strategy_missing_test_asset_00",
      decimals: 5,
      blockchainRid: multichain00.rid,
      supply: 10000n,
      iconUrl: "https://missing.asset",
      type: ASSET_TYPE_FT4,
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
      nonExistentChain00Asset,
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

    const { account: senderAccount } = (
      await registerAccount(senderConnection, keyStore, open(authDescriptor))
    ).session;

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

    const recipientSession = (
      await registerAccount(
        recipientConnection,
        keyStore,
        fee(senderConnection.blockchainRid, asset, authDescriptor),
      )
    ).session;

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

  it("can complete pending crosschain transfers when account is registered with direct strategies", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(senderConnection, keyStore, open(authDescriptor))
    ).session;

    const startingAmount = createAmount(20, 5);
    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderSession.account.id,
      asset.id,
      startingAmount,
    );

    const recipientId = gtv.gtvHash(sigProv.pubKey);
    expect(senderSession.account.id).toEqual(recipientId);

    const _allowedAssets = (await recipientConnection.query(
      allowedAssets(
        senderConnection.blockchainRid,
        senderSession.account.id,
        recipientId,
      ),
    ))!;

    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find(
      (v) => v.asset_id.compare(asset.id) === 0,
    )?.min_amount;

    expect(rawAmount).toEqual(1000000n);

    await senderSession.account.crosschainTransfer(
      recipientConnection.blockchainRid,
      recipientId,
      asset.id,
      createAmountFromBalance(rawAmount!, asset.decimals),
    );

    const recipientSession = (
      await registerAccount(recipientConnection, keyStore, open(authDescriptor))
    ).session;

    expect(recipientSession.account.id).toEqual(recipientId);

    const assetBalanceRecipient =
      await recipientSession.account.getBalanceByAssetId(asset.id);
    expect(assetBalanceRecipient?.amount?.value).toBe(rawAmount);

    const assetBalanceSender = await senderSession.account.getBalanceByAssetId(
      asset.id,
    );
    expect(assetBalanceSender?.amount?.value).toBe(
      startingAmount.value - rawAmount!,
    );

    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);
  });

  it("can resume account registration when transfer is interrupted", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(senderConnection, keyStore, open(authDescriptor))
    ).session;
    const senderAccount = senderSession.account;

    const feeAmounts = await recipientConnection.query(feeAssets());
    const amount = feeAmounts.find((amt) =>
      amt.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);
    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      feeAmount,
    );

    const recipientId = gtv.gtvHash(sigProv.pubKey);
    expect(senderAccount.id).toEqual(recipientId);

    await senderSession
      .transactionBuilder()
      .add(
        initTransfer(recipientId, asset.id, feeAmount, [
          recipientConnection.blockchainRid,
        ]),
      )
      .buildAndSendWithAnchoring();

    const recipientSession = (
      await registerAccount(
        recipientConnection,
        keyStore,
        fee(senderConnection.blockchainRid, asset, authDescriptor),
      )
    ).session;
    expect(recipientSession.account.id).toEqual(recipientId);
  });

  it("can resume account registration when transfer is completed but account is not registered yet", async () => {
    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(senderConnection, keyStore, open(authDescriptor))
    ).session;
    const senderAccount = senderSession.account;

    const feeAmounts = await recipientConnection.query(feeAssets());
    const amount = feeAmounts.find((amt) =>
      amt.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);
    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      feeAmount,
    );

    const recipientId = gtv.gtvHash(keyStore.id);
    expect(senderAccount.id).toEqual(recipientId);

    await senderAccount.crosschainTransfer(
      recipientConnection.blockchainRid,
      recipientId,
      asset.id,
      feeAmount,
    );

    const recipientSession = (
      await registerAccount(
        recipientConnection,
        keyStore,
        fee(senderConnection.blockchainRid, asset, authDescriptor),
      )
    ).session;
    expect(recipientSession.account.id).toEqual(recipientId);
  });

  it("handles asset coming from wrong chain properly", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { account: unrelatedAccount } = (
      await registerAccount(unrelatedConnection, keyStore, open(authDescriptor))
    ).session;

    const senderSession = (
      await registerAccount(senderConnection, keyStore, open(authDescriptor))
    ).session;

    const startingAmount = createAmount(20, 5);
    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderSession.account.id,
      asset.id,
      startingAmount,
    );

    await senderSession.account.crosschainTransfer(
      unrelatedConnection.client.config.blockchainRid + "",
      unrelatedAccount.id,
      asset.id,
      startingAmount,
    );

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
      fee(
        senderConnection.blockchainRid,
        nonExistentChain00Asset,
        authDescriptor,
      ),
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

    const { account: senderAccount } = (
      await registerAccount(senderConnection, keyStore, open(authDescriptor))
    ).session;

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

  it("throws error when account is already registered", async () => {
    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session } = await registerAccount(
      senderConnection,
      keyStore,
      open(authDescriptor),
    );

    const feeAmounts = await recipientConnection.query(feeAssets());
    const amount = feeAmounts.find((amount) =>
      amount.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);

    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      session.account.id,
      asset.id,
      feeAmount,
    );

    await registerAccount(
      recipientConnection,
      keyStore,
      fee(senderConnection.blockchainRid, asset, authDescriptor),
    );

    const promise = registerAccount(
      recipientConnection,
      keyStore,
      fee(senderConnection.blockchainRid, asset, authDescriptor),
    );

    expect(promise).rejects.toThrow(
      `Account <${session.account.id.toString("hex")}> already registered on blockchain <${recipientConnection.blockchainRid.toString("hex")}>`,
    );
  });
});

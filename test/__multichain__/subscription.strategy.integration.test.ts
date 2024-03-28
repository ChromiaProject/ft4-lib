import {
  adminUser,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getNewAsset,
} from "@ft4-test/util";
import { createSingleSigAuthDescriptorRegistration } from "@ft4/accounts";
import { mint, registerCrosschainAsset } from "@ft4/admin";
import {
  ASSET_TYPE_FT4,
  Asset,
  createAmount,
  createAmountFromBalance,
} from "@ft4/asset";
import { createInMemoryFtKeyStore, days } from "@ft4/authentication";
import { initTransfer } from "@ft4/crosschain";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  allowedAssets,
  pendingTransferStrategies,
  registerAccount,
  registrationStrategy,
  subscriptionAssets,
} from "@ft4/registration";
import { encryption, gtv, newSignatureProvider } from "postchain-client";

let asset: Asset;
let nonExistentChain00Asset: Asset;
let senderConnection: Connection;
let recipientConnection: Connection;
let unrelatedConnection: Connection;

describe("Subscription account creation single step", () => {
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
      "subscription_strategy_test_asset_00",
      "SUBSCRIPTION_STRATEGY_TEST_ASSET_00",
      5,
    );

    // based on the assumption that asset ID is:
    // (name, blockchain_rid).hash()
    const missingAssetId = gtv.gtvHash([
      "subscription_strategy_missing_test_asset_00",
      multichain00.rid,
    ]);

    nonExistentChain00Asset = {
      id: missingAssetId,
      name: "subscription_strategy_missing_test_asset_00",
      symbol: "subscription_strategy_missing_test_asset_00",
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

  it("can register account which receives transferred assets, minus subscription fee", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { account: senderAccount } = (
      await registerAccount(
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
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

    const _subscriptionAssets =
      await recipientConnection.query(subscriptionAssets());
    expect(_subscriptionAssets).toBeTruthy();
    const subscriptionRawAmount = _subscriptionAssets.find(
      (v) => v.asset_id.compare(asset.id) === 0,
    )?.amount;

    expect(rawAmount).toEqual(1000000n);
    expect(subscriptionRawAmount).toEqual(1000000n);

    const recipientSession = (
      await registerAccount(
        recipientConnection.client,
        keyStore,
        registrationStrategy.subscription(
          senderConnection.blockchainRid,
          asset,
          authDescriptor,
        ),
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
      startingAmount.value - subscriptionRawAmount!,
    );

    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);
  });

  it("can resume account creation when transfer is interrupted", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;
    const senderAccount = senderSession.account;

    const subscriptionAmounts =
      await recipientConnection.query(subscriptionAssets());
    const amount = subscriptionAmounts.find((amount) =>
      amount.asset_id.equals(asset.id),
    )!.amount;
    const subscriptionAmount = createAmountFromBalance(amount, asset.decimals);

    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      subscriptionAmount,
    );

    const recipientId = gtv.gtvHash(sigProv.pubKey);

    await senderSession
      .transactionBuilder()
      .add(
        initTransfer(
          recipientId,
          asset.id,
          subscriptionAmount,
          [recipientConnection.blockchainRid],
          Date.now() + days(1),
        ),
      )
      .buildAndSendWithAnchoring();

    const recipientSession = (
      await registerAccount(
        recipientConnection.client,
        keyStore,
        registrationStrategy.subscription(
          senderConnection.blockchainRid,
          asset,
          authDescriptor,
        ),
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
      await registerAccount(
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;
    const senderAccount = senderSession.account;

    const subscriptionAmounts =
      await recipientConnection.query(subscriptionAssets());
    const amount = subscriptionAmounts.find((amt) =>
      amt.asset_id.equals(asset.id),
    )!.amount;

    const subscriptionAmount = createAmountFromBalance(amount, asset.decimals);

    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      subscriptionAmount,
    );

    const recipientId = gtv.gtvHash(keyStore.id);
    expect(senderAccount.id).toEqual(recipientId);

    await senderSession.account.crosschainTransfer(
      recipientConnection.blockchainRid,
      recipientId,
      asset.id,
      subscriptionAmount,
    );

    const recipientSession = (
      await registerAccount(
        recipientConnection.client,
        keyStore,
        registrationStrategy.subscription(
          senderConnection.blockchainRid,
          asset,
          authDescriptor,
        ),
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
      await registerAccount(
        unrelatedConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;

    const senderSession = (
      await registerAccount(
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
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

    const _subscriptionAssets =
      await recipientConnection.query(subscriptionAssets());
    expect(_subscriptionAssets).toBeTruthy();

    const recipientSessionPromise = registerAccount(
      recipientConnection.client,
      keyStore,
      registrationStrategy.subscription(
        unrelatedConnection.blockchainRid,
        asset,
        authDescriptor,
      ),
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

    await registerAccount(
      senderConnection.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    const recipientId = gtv.gtvHash(sigProv.pubKey);

    const recipientSessionPromise = registerAccount(
      recipientConnection.client,
      keyStore,
      registrationStrategy.subscription(
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
      recipientConnection.client,
      keyStore,
      registrationStrategy.subscription(
        senderConnection.blockchainRid,
        asset,
        authDescriptor,
      ),
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
      await registerAccount(
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
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
      recipientConnection.client,
      keyStore,
      registrationStrategy.subscription(
        senderConnection.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    // originalError: balance is too low
    await expect(recipientSessionPromise).rejects.toThrow();

    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);
    expect(await recipientConnection.getAccountById(recipientId)).toBeNull();
  });

  it("throws error if account is already registered", async () => {
    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session } = await registerAccount(
      senderConnection.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    const subscriptionAmounts =
      await recipientConnection.query(subscriptionAssets());
    const amount = subscriptionAmounts.find((amount) =>
      amount.asset_id.equals(asset.id),
    )!.amount;

    const subscriptionAmount = createAmountFromBalance(amount, asset.decimals);

    mint(
      senderConnection.client,
      adminUser().signatureProvider,
      session.account.id,
      asset.id,
      subscriptionAmount,
    );

    await registerAccount(
      recipientConnection.client,
      keyStore,
      registrationStrategy.subscription(
        senderConnection.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    const promise = registerAccount(
      recipientConnection.client,
      keyStore,
      registrationStrategy.subscription(
        senderConnection.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    expect(promise).rejects.toThrow(
      `Account <${session.account.id.toString("hex")}> already registered on blockchain <${recipientConnection.blockchainRid.toString("hex")}>`,
    );
  });
});

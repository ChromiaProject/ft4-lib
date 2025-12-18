import {
  AccountBuilder,
  adminUser,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getNewAsset,
  mapAssetToCrosschainAssetRegistration,
  registerCrosschainAsset,
} from "@ft4-test/util";
import {
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts";
import {
  mint,
  registerCrosschainAsset as adminRegisterCrosschainAsset,
} from "@ft4/admin";
import {
  ASSET_TYPE_FT4,
  Asset,
  createAmount,
  createAmountFromBalance,
} from "@ft4/asset";
import {
  createInMemoryFtKeyStore,
  days,
  noopAuthenticator,
} from "@ft4/authentication";
import { initTransfer, crosschainTransfer } from "@ft4/crosschain";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  allowedAssets,
  feeAssets,
  pendingTransferStrategies,
  registerAccount,
  registrationStrategy,
} from "@ft4/registration";
import {
  encryption,
  formatter,
  gtv,
  gtx,
  newSignatureProvider,
} from "postchain-client";
import { nop } from "@ft4/utils/index";
import { recallUnclaimedTransfer } from "@ft4/crosschain/operations";
import { transactionBuilder } from "@ft4/transaction-builder/index";

let asset: Asset;
let timeoutAsset: Asset;
let nonExistentChain00Asset: Asset;
let connection0: Connection;
let connection1: Connection;
let connection2: Connection;

describe("Fee account creation single step", () => {
  beforeAll(async () => {
    const { multichain00, multichain01, multichain02 } =
      await fetchBlockchains();
    connection0 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    connection1 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );
    connection2 = createConnection(
      await createChromiaClientToMultichain(multichain02.rid),
    );

    asset = await getNewAsset(
      connection0.client,
      "fee_strategy_test_asset_00",
      "FEE_STRATEGY_TEST_ASSET_00",
      5,
    );

    timeoutAsset = await getNewAsset(
      connection0.client,
      "fee_strategy_timeout_test_asset_00",
      "FEE_STRATEGY_TIMEOUT_TEST_ASSET_00",
      5,
    );

    // based on the assumption that asset ID is:
    // (name, blockchain_rid).hash()
    const missingAssetId = gtv.gtvHash(
      ["fee_strategy_missing_test_asset_00", multichain00.rid],
      connection0.client.config.merkleHashVersion,
    );

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
    await adminRegisterCrosschainAsset(
      connection1.client,
      adminUser().signatureProvider,
      asset.id,
      multichain00.rid,
    );
    await adminRegisterCrosschainAsset(
      connection1.client,
      adminUser().signatureProvider,
      timeoutAsset.id,
      multichain00.rid,
    );

    await registerCrosschainAsset(
      connection1,
      adminUser().signatureProvider,
      mapAssetToCrosschainAssetRegistration(nonExistentChain00Asset),
      multichain00.rid,
    );

    await adminRegisterCrosschainAsset(
      connection2.client,
      adminUser().signatureProvider,
      asset.id,
      multichain01.rid,
    );
  });

  it("can register account which receives transferred assets, minus fee", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const { account: senderAccount } = (
      await registerAccount(
        connection0.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;

    const startingAmount = createAmount(20, 5);
    await mint(
      connection0.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      startingAmount,
    );

    const recipientId = gtv.gtvHash(
      sigProv.pubKey,
      connection1.client.config.merkleHashVersion,
    );
    expect(senderAccount.id).toEqual(recipientId);

    const _allowedAssets = (await connection1.query(
      allowedAssets(connection0.blockchainRid, senderAccount.id, recipientId),
    ))!;

    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.min_amount;

    const _feeAssets = await connection1.query(feeAssets());
    expect(_feeAssets).toBeTruthy();
    const feeRawAmount = _feeAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.amount;

    expect(rawAmount).toEqual(1000000n);
    expect(feeRawAmount).toEqual(1000000n);

    const recipientSession = (
      await registerAccount(
        connection1.client,
        keyStore,
        registrationStrategy.fee(
          connection0.blockchainRid,
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
      startingAmount.value - feeRawAmount!,
    );

    expect(
      (await connection1.query(pendingTransferStrategies(recipientId))).length,
    ).toBe(0);
  });

  it("ZZZ doesn't mix two transfers from different rules and the same asset", async () => {
    const asset = await getNewAsset(
      connection0.client,
      "fee_sum_two_transfers",
      "FEE_SUM_TWO_TRANSFERS",
      1,
    );
    await adminRegisterCrosschainAsset(
      connection1.client,
      adminUser().signatureProvider,
      asset.id,
      connection0.blockchainRid,
    );
    await adminRegisterCrosschainAsset(
      connection2.client,
      adminUser().signatureProvider,
      asset.id,
      connection1.blockchainRid,
    );

    const keyPair = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(keyPair);
    const sender0 = await AccountBuilder.account(connection0)
      .withSigner(keyPair)
      .withBalance(asset, 10)
      .build();
    const sender1 = await AccountBuilder.account(connection1).build();
    const recipientId = sender0.id;
    const recipientAuthDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
      null,
    );
    console.log("sender0", sender0.id.toString("hex"));
    console.log("sender1", sender1.id.toString("hex"));
    console.log("recipientId", recipientId.toString("hex"));
    await sender0.crosschainTransfer(
      connection1.blockchainRid,
      sender1.id,
      asset.id,
      createAmount(5, asset.decimals),
    );
    await sender1.crosschainTransfer(
      connection2.blockchainRid,
      recipientId,
      asset.id,
      createAmount(5, asset.decimals),
    );
    await sender0.crosschainTransfer(
      connection2.blockchainRid,
      recipientId,
      asset.id,
      createAmount(5, asset.decimals),
    );

    const promise = registerAccount(
      connection2.client,
      keyStore,
      registrationStrategy.fee(
        connection0.blockchainRid,
        asset,
        recipientAuthDescriptor,
      ),
    );

    await expect(promise).rejects.toThrow();

    const assetBalanceSender0 = await sender0.getBalanceByAssetId(asset.id);
    expect(assetBalanceSender0).toBe(null);
    const assetBalanceSender1 = await sender1.getBalanceByAssetId(asset.id);
    expect(assetBalanceSender1).toBe(null);

    expect(
      (await connection2.query(pendingTransferStrategies(recipientId))).length,
    ).toBe(1);
  });

  it("can complete pending crosschain transfers when account is registered with direct strategies", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(
        connection0.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;

    const startingAmount = createAmount(20, 5);
    await mint(
      connection0.client,
      adminUser().signatureProvider,
      senderSession.account.id,
      asset.id,
      startingAmount,
    );

    const recipientId = gtv.gtvHash(
      sigProv.pubKey,
      connection1.client.config.merkleHashVersion,
    );
    expect(senderSession.account.id).toEqual(recipientId);

    const _allowedAssets = (await connection1.query(
      allowedAssets(
        connection0.blockchainRid,
        senderSession.account.id,
        recipientId,
      ),
    ))!;

    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.min_amount;

    expect(rawAmount).toEqual(1000000n);

    const transferRef = await senderSession.account.crosschainTransfer(
      connection1.blockchainRid,
      recipientId,
      asset.id,
      createAmountFromBalance(rawAmount!, asset.decimals),
    );

    const recipientSession = (
      await registerAccount(
        connection1.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
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
      (await connection1.query(pendingTransferStrategies(recipientId))).length,
    ).toBe(0);

    await expect(
      senderSession.account.recallUnclaimedCrosschainTransfer(transferRef),
    ).rejects.toThrow("No pending transfer found");
  });

  it("can resume account registration when transfer is interrupted", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(
        connection0.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;
    const senderAccount = senderSession.account;

    const feeAmounts = await connection1.query(feeAssets());
    const amount = feeAmounts.find((amt) =>
      amt.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);
    await mint(
      connection0.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      feeAmount,
    );

    const recipientId = gtv.gtvHash(
      sigProv.pubKey,
      connection1.client.config.merkleHashVersion,
    );
    expect(senderAccount.id).toEqual(recipientId);

    await senderSession
      .transactionBuilder()
      .add(
        initTransfer(
          recipientId,
          asset.id,
          feeAmount,
          [connection1.blockchainRid],
          Date.now() + days(1),
        ),
      )
      .buildAndSendWithAnchoring();

    const recipientSession = (
      await registerAccount(
        connection1.client,
        keyStore,
        registrationStrategy.fee(
          connection0.blockchainRid,
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
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(
        connection0.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;
    const senderAccount = senderSession.account;

    const feeAmounts = await connection1.query(feeAssets());
    const amount = feeAmounts.find((amt) =>
      amt.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);
    await mint(
      connection0.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      feeAmount,
    );

    const recipientId = gtv.gtvHash(
      keyStore.id,
      connection1.client.config.merkleHashVersion,
    );
    expect(senderAccount.id).toEqual(recipientId);

    const transferRef = await senderAccount.crosschainTransfer(
      connection1.blockchainRid,
      recipientId,
      asset.id,
      feeAmount,
    );

    await expect(
      senderSession.account.recallUnclaimedCrosschainTransfer(transferRef),
    ).rejects.toThrow("This transfer has not timed out yet");

    const recipientSession = (
      await registerAccount(
        connection1.client,
        keyStore,
        registrationStrategy.fee(
          connection0.blockchainRid,
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
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const { account: unrelatedAccount } = (
      await registerAccount(
        connection2.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;

    const senderSession = (
      await registerAccount(
        connection0.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;

    const startingAmount = createAmount(20, 5);
    await mint(
      connection0.client,
      adminUser().signatureProvider,
      senderSession.account.id,
      asset.id,
      startingAmount,
    );

    await senderSession.account.crosschainTransfer(
      connection2.client.config.blockchainRid + "",
      unrelatedAccount.id,
      asset.id,
      startingAmount,
    );

    const recipientId = gtv.gtvHash(
      sigProv.pubKey,
      connection1.client.config.merkleHashVersion,
    );
    expect(unrelatedAccount.id).toEqual(recipientId);

    const _allowedAssets = (await connection1.query(
      allowedAssets(
        connection2.blockchainRid,
        unrelatedAccount.id,
        recipientId,
      ),
    ))!;

    expect(_allowedAssets.length).toBe(0);

    const _feeAssets = await connection1.query(feeAssets());
    expect(_feeAssets).toBeTruthy();

    const recipientSessionPromise = registerAccount(
      connection1.client,
      keyStore,
      registrationStrategy.fee(
        connection2.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    await expect(recipientSessionPromise).rejects.toThrow();

    expect(
      (await connection1.query(pendingTransferStrategies(recipientId))).length,
    ).toBe(0);
    expect(await connection1.getAccountById(recipientId)).toBeNull();
  });

  it("handles asset missing on source chain properly", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    await registerAccount(
      connection0.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    const recipientId = gtv.gtvHash(
      sigProv.pubKey,
      connection1.client.config.merkleHashVersion,
    );

    const recipientSessionPromise = registerAccount(
      connection1.client,
      keyStore,
      registrationStrategy.fee(
        connection0.blockchainRid,
        nonExistentChain00Asset,
        authDescriptor,
      ),
    );

    await expect(recipientSessionPromise).rejects.toThrow(
      "The specified asset could not be found",
    );

    expect(
      (await connection1.query(pendingTransferStrategies(recipientId))).length,
    ).toBe(0);
    expect(await connection1.getAccountById(recipientId)).toBeNull();
  });

  it("handles missing account on source chain properly", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const recipientId = gtv.gtvHash(
      sigProv.pubKey,
      connection1.client.config.merkleHashVersion,
    );

    const recipientSessionPromise = registerAccount(
      connection1.client,
      keyStore,
      registrationStrategy.fee(
        connection0.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    // originalError:  No key handler registered to handle operation <ft4.crosschain.init_transfer>
    await expect(recipientSessionPromise).rejects.toThrow();

    expect(
      (await connection1.query(pendingTransferStrategies(recipientId))).length,
    ).toBe(0);
    expect(await connection1.getAccountById(recipientId)).toBeNull();
  });

  it("handles insufficient balance on source chain properly", async () => {
    const sigProv = newSignatureProvider();
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const { account: senderAccount } = (
      await registerAccount(
        connection0.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;

    const startingAmount = createAmount(0.01, 5);
    await mint(
      connection0.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      startingAmount,
    );

    const recipientId = gtv.gtvHash(
      sigProv.pubKey,
      connection1.client.config.merkleHashVersion,
    );

    const recipientSessionPromise = registerAccount(
      connection1.client,
      keyStore,
      registrationStrategy.fee(
        connection0.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    // originalError: balance is too low
    await expect(recipientSessionPromise).rejects.toThrow();

    expect(
      (await connection1.query(pendingTransferStrategies(recipientId))).length,
    ).toBe(0);
    expect(await connection1.getAccountById(recipientId)).toBeNull();
  });

  it("throws error when account is already registered", async () => {
    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const { session } = await registerAccount(
      connection0.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    const feeAmounts = await connection1.query(feeAssets());
    const amount = feeAmounts.find((amount) =>
      amount.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);

    await mint(
      connection0.client,
      adminUser().signatureProvider,
      session.account.id,
      asset.id,
      feeAmount,
    );

    await registerAccount(
      connection1.client,
      keyStore,
      registrationStrategy.fee(
        connection0.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    const promise = registerAccount(
      connection1.client,
      keyStore,
      registrationStrategy.fee(
        connection0.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    await expect(promise).rejects.toThrow(
      `Account <${session.account.id.toString("hex")}> already registered on blockchain <${connection1.blockchainRid.toString("hex")}>`,
    );
  });

  it("can recall completed crosschain transfer if account is not registered after timeout, but not twice", async () => {
    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(
        connection0.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;
    const senderAccount = senderSession.account;

    const feeAmounts = await connection1.query(feeAssets());
    const amount = feeAmounts.find((amt) =>
      amt.asset_id.equals(timeoutAsset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, timeoutAsset.decimals);
    await mint(
      connection0.client,
      adminUser().signatureProvider,
      senderAccount.id,
      timeoutAsset.id,
      feeAmount,
    );

    const recipientId = gtv.gtvHash(
      keyStore.id,
      connection1.client.config.merkleHashVersion,
    );
    expect(senderAccount.id).toEqual(recipientId);

    const transferRef = await crosschainTransfer(
      connection0,
      senderAccount.authenticator,
      connection1.blockchainRid,
      recipientId,
      timeoutAsset.id,
      feeAmount,
      /*ttl=*/ 5000,
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(await senderAccount.getBalanceByAssetId(timeoutAsset.id)).toBeNull();
    expect(
      await connection1.query(pendingTransferStrategies(recipientId)),
    ).toContain("fee");

    await senderSession.account.recallUnclaimedCrosschainTransfer(transferRef);

    expect(
      (await senderAccount.getBalanceByAssetId(timeoutAsset.id))!.amount.value,
    ).toBe(amount);
    expect(
      (await connection1.query(pendingTransferStrategies(recipientId))).length,
    ).toBe(0);
    await expect(
      transactionBuilder(noopAuthenticator, connection1.client)
        .add(recallUnclaimedTransfer(transferRef.tx, transferRef.opIndex), {
          authenticator: noopAuthenticator,
        })
        .add(nop())
        .buildAndSend(),
    ).rejects.toThrow(
      `Transaction <0x${formatter.toString(gtx.getDigestToSign(transferRef.tx, connection1.client.config.merkleHashVersion)).toLowerCase()}> transfer at index <${transferRef.opIndex}> has already been recalled on this chain.`,
    );
  });
});

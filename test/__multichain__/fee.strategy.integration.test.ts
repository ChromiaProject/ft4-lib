import {
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
  newSignatureProvider,
} from "postchain-client";
import { nop } from "@ft4/utils/index";
import { recallUnclaimedTransfer } from "@ft4/crosschain/operations";
import { transactionBuilder } from "@ft4/transaction-builder/index";
import {
  recallCrosschainTransferAndGetRecalledTransfer,
  setTransferFilter,
} from "./crosschain-query-setups";
import { setupTestEnvironment } from "./common-setup";

let asset: Asset;
let timeoutAsset: Asset;
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

    timeoutAsset = await getNewAsset(
      senderConnection.client,
      "fee_strategy_timeout_test_asset_00",
      "FEE_STRATEGY_TIMEOUT_TEST_ASSET_00",
      5,
    );

    // based on the assumption that asset ID is:
    // (name, blockchain_rid).hash()
    const missingAssetId = gtv.gtvHash([
      "fee_strategy_missing_test_asset_00",
      multichain00.rid,
    ]);

    nonExistentChain00Asset = {
      rowId: Math.floor(Math.random()),
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
      recipientConnection.client,
      adminUser().signatureProvider,
      asset.id,
      multichain00.rid,
    );
    await adminRegisterCrosschainAsset(
      recipientConnection.client,
      adminUser().signatureProvider,
      timeoutAsset.id,
      multichain00.rid,
    );

    await registerCrosschainAsset(
      recipientConnection,
      adminUser().signatureProvider,
      mapAssetToCrosschainAssetRegistration(nonExistentChain00Asset),
      multichain00.rid,
    );

    await adminRegisterCrosschainAsset(
      unrelatedConnection.client,
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
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;

    const startingAmount = createAmount(20, 5);
    await mint(
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
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.min_amount;

    const _feeAssets = await recipientConnection.query(feeAssets());
    expect(_feeAssets).toBeTruthy();
    const feeRawAmount = _feeAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.amount;

    expect(rawAmount).toEqual(1000000n);
    expect(feeRawAmount).toEqual(1000000n);

    const recipientSession = (
      await registerAccount(
        recipientConnection.client,
        keyStore,
        registrationStrategy.fee(
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
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const senderSession = (
      await registerAccount(
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;

    const startingAmount = createAmount(20, 5);
    await mint(
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
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.min_amount;

    expect(rawAmount).toEqual(1000000n);

    const transferRef = await senderSession.account.crosschainTransfer(
      recipientConnection.blockchainRid,
      recipientId,
      asset.id,
      createAmountFromBalance(rawAmount!, asset.decimals),
    );

    const recipientSession = (
      await registerAccount(
        recipientConnection.client,
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
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
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
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;
    const senderAccount = senderSession.account;

    const feeAmounts = await recipientConnection.query(feeAssets());
    const amount = feeAmounts.find((amt) =>
      amt.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);
    await mint(
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
        initTransfer(
          recipientId,
          asset.id,
          feeAmount,
          [recipientConnection.blockchainRid],
          Date.now() + days(1),
        ),
      )
      .buildAndSendWithAnchoring();

    const recipientSession = (
      await registerAccount(
        recipientConnection.client,
        keyStore,
        registrationStrategy.fee(
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
      [AuthFlag.Account, AuthFlag.Transfer],
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

    const feeAmounts = await recipientConnection.query(feeAssets());
    const amount = feeAmounts.find((amt) =>
      amt.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);
    await mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderAccount.id,
      asset.id,
      feeAmount,
    );

    const recipientId = gtv.gtvHash(keyStore.id);
    expect(senderAccount.id).toEqual(recipientId);

    const transferRef = await senderAccount.crosschainTransfer(
      recipientConnection.blockchainRid,
      recipientId,
      asset.id,
      feeAmount,
    );

    await expect(
      senderSession.account.recallUnclaimedCrosschainTransfer(transferRef),
    ).rejects.toThrow("This transfer has not timed out yet");

    const recipientSession = (
      await registerAccount(
        recipientConnection.client,
        keyStore,
        registrationStrategy.fee(
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
      [AuthFlag.Account, AuthFlag.Transfer],
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
    await mint(
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
      recipientConnection.client,
      keyStore,
      registrationStrategy.fee(
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
      [AuthFlag.Account, AuthFlag.Transfer],
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
      registrationStrategy.fee(
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
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const recipientId = gtv.gtvHash(sigProv.pubKey);

    const recipientSessionPromise = registerAccount(
      recipientConnection.client,
      keyStore,
      registrationStrategy.fee(
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
      [AuthFlag.Account, AuthFlag.Transfer],
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
    await mint(
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
      registrationStrategy.fee(
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

  it("throws error when account is already registered", async () => {
    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    const { session } = await registerAccount(
      senderConnection.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    const feeAmounts = await recipientConnection.query(feeAssets());
    const amount = feeAmounts.find((amount) =>
      amount.asset_id.equals(asset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, asset.decimals);

    await mint(
      senderConnection.client,
      adminUser().signatureProvider,
      session.account.id,
      asset.id,
      feeAmount,
    );

    await registerAccount(
      recipientConnection.client,
      keyStore,
      registrationStrategy.fee(
        senderConnection.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    const promise = registerAccount(
      recipientConnection.client,
      keyStore,
      registrationStrategy.fee(
        senderConnection.blockchainRid,
        asset,
        authDescriptor,
      ),
    );

    await expect(promise).rejects.toThrow(
      `Account <${session.account.id.toString("hex")}> already registered on blockchain <${recipientConnection.blockchainRid.toString("hex")}>`,
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
        senderConnection.client,
        keyStore,
        registrationStrategy.open(authDescriptor),
      )
    ).session;
    const senderAccount = senderSession.account;

    const feeAmounts = await recipientConnection.query(feeAssets());
    const amount = feeAmounts.find((amt) =>
      amt.asset_id.equals(timeoutAsset.id),
    )!.amount;

    const feeAmount = createAmountFromBalance(amount, timeoutAsset.decimals);
    await mint(
      senderConnection.client,
      adminUser().signatureProvider,
      senderAccount.id,
      timeoutAsset.id,
      feeAmount,
    );

    const recipientId = gtv.gtvHash(keyStore.id);
    expect(senderAccount.id).toEqual(recipientId);

    const transferRef = await crosschainTransfer(
      senderConnection,
      senderAccount.authenticator,
      recipientConnection.blockchainRid,
      recipientId,
      timeoutAsset.id,
      feeAmount,
      /*ttl=*/ 5000,
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(await senderAccount.getBalanceByAssetId(timeoutAsset.id)).toBeNull();
    expect(
      await recipientConnection.query(pendingTransferStrategies(recipientId)),
    ).toContain("fee");

    await senderSession.account.recallUnclaimedCrosschainTransfer(transferRef);

    expect(
      (await senderAccount.getBalanceByAssetId(timeoutAsset.id))!.amount.value,
    ).toBe(amount);
    expect(
      (await recipientConnection.query(pendingTransferStrategies(recipientId)))
        .length,
    ).toBe(0);

    await expect(
      transactionBuilder(noopAuthenticator, recipientConnection.client)
        .add(recallUnclaimedTransfer(transferRef.tx, transferRef.opIndex), {
          authenticator: noopAuthenticator,
        })
        .add(nop())
        .buildAndSend(),
    ).rejects.toThrow(
      `Transaction <0x${formatter.toString(gtv.gtvHash(transferRef.tx[0])).toLowerCase()}> transfer at index <${transferRef.opIndex}> has already been recalled on this chain.`,
    );
  });

  describe("getRecalledTransferByRowid", () => {
    it("returns null when recalled transfer is not found or does not exist", async () => {
      const { multichain00 } = await fetchBlockchains();
      const connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid),
      );

      const fetchedRecalledTransfer =
        await connection00.getRecalledTransferByRowid(0);
      expect(fetchedRecalledTransfer).toBeNull();
    });

    it("returns null when recalled transfer exists but not for the selected rowid", async () => {
      await recallCrosschainTransferAndGetRecalledTransfer(
        senderConnection,
        recipientConnection,
        timeoutAsset,
      );

      const fetchedRecalledTransfer =
        await recipientConnection.getRecalledTransferByRowid(999);
      expect(fetchedRecalledTransfer).toBeNull();
    });

    it("returns recalled transfer by rowid", async () => {
      const { recalledTransfersFiltered, recalledTransfer } =
        await recallCrosschainTransferAndGetRecalledTransfer(
          senderConnection,
          recipientConnection,
          timeoutAsset,
        );

      const fetchedRecalledTransfer =
        await recipientConnection.getRecalledTransferByRowid(
          recalledTransfersFiltered.data[0].rowId,
        );

      expect(fetchedRecalledTransfer).toEqual(recalledTransfer);
    });
  });

  describe("getRecalledTransfersFiltered", () => {
    const mockBuffer: Buffer = Buffer.alloc(32);
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-1",
      );

      const promise = testContext.connection0.getRecalledTransfersFiltered(
        setTransferFilter([], mockBuffer),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-2",
      );

      const promise = testContext.connection0.getRecalledTransfersFiltered(
        setTransferFilter([], null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_tx_rid filter is required",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getRecalledTransfersFiltered(null, 1);
      const foundRecalledTransfer =
        data.find((item) => item.rowId === 999) ?? null;
      expect(foundRecalledTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getRecalledTransfersFiltered(
          setTransferFilter([0], mockBuffer, 0),
          1,
        );

      expect(data.length).toBe(0);
    });
    it("returns paginated recalled transfers without filter", async () => {
      const { recalledTransfer } =
        await recallCrosschainTransferAndGetRecalledTransfer(
          senderConnection,
          recipientConnection,
          timeoutAsset,
        );

      const { data } = await recipientConnection.getRecalledTransfersFiltered(
        null,
        1,
      );

      expect(data[0]).toEqual(recalledTransfer);
    });
    it("returns paginated recalled transfers with all filter", async () => {
      const { recalledTransfer } =
        await recallCrosschainTransferAndGetRecalledTransfer(
          senderConnection,
          recipientConnection,
          timeoutAsset,
        );

      const { data } = await recipientConnection.getRecalledTransfersFiltered(
        setTransferFilter(
          [recalledTransfer.rowId],
          recalledTransfer.initTxRid,
          recalledTransfer.initOpIndex,
        ),
        1,
      );

      expect(data[0]).toEqual(recalledTransfer);
    });
  });
});

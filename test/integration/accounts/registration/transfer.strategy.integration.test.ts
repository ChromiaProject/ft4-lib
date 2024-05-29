import {
  AccountBuilder,
  addNewAssetIfNeeded,
  useChromiaNode,
} from "@ft4-test/util";
import { createSingleSigAuthDescriptorRegistration } from "@ft4/accounts";
import { Asset, createAmount, createAmountFromBalance } from "@ft4/asset";
import { createInMemoryFtKeyStore } from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  allowedAssets,
  hasPendingCreateAccountTransferForStrategy,
  pendingTransferStrategies,
  registerAccount,
  registrationStrategy,
} from "@ft4/registration";
import { TxRejectedError, encryption, gtv } from "postchain-client";

let connection: Connection;
let asset: Asset;

describe("Test transfer strategy", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
    asset = await addNewAssetIfNeeded(
      connection.client,
      "transfer_strategy_asset",
      "TRANSFER_STRATEGY_ASSET",
      5,
    );
  });

  it("can register account which receives transferred assets, and it cannot be recalled", async () => {
    const keyPair = encryption.makeKeyPair();
    const recipientId = gtv.gtvHash(keyPair.pubKey);

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const _allowedAssets = (await connection.query(
      allowedAssets(connection.blockchainRid, account1.id, recipientId),
    ))!;
    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.min_amount;
    expect(rawAmount).toBeTruthy();
    const amount = createAmountFromBalance(rawAmount!, asset.decimals);

    const { receipt } = await account1.transfer(recipientId, asset.id, amount);

    const strategies = await connection.query(
      pendingTransferStrategies(recipientId),
    );
    expect(strategies).toContain("open");

    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session } = await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.transferOpen(authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.value).toBe(amount.value);

    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);

    await expect(
      account1.recallUnclaimedTransfer(receipt.transactionRid, 1),
    ).rejects.toThrow("No pending transfer found");
  });

  it("can not register account without pending transfer", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    await expect(
      registerAccount(
        connection.client,
        keyStore,
        registrationStrategy.transferOpen(authDescriptor),
      ),
    ).rejects.toThrow(TxRejectedError);
  });

  it("can find pending create account transfer when transfer is made and account registration is not completed", async () => {
    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const recipientId = gtv.gtvHash(keyStore.pubKey);

    const sender = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const amount = createAmount(100, asset.decimals);

    await sender.transfer(recipientId, asset.id, amount);

    const hasPendingAccountCreation = await connection.query(
      hasPendingCreateAccountTransferForStrategy(
        "open",
        connection.blockchainRid,
        sender.id,
        recipientId,
        asset.id,
        amount.value,
      ),
    );

    expect(hasPendingAccountCreation).toBeTruthy();
  });

  it("cannot find pending create account transfer when account registration is completed", async () => {
    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const recipientId = gtv.gtvHash(keyStore.pubKey);

    const sender = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const amount = createAmount(100, asset.decimals);

    await sender.transfer(recipientId, asset.id, amount);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.transferOpen(authDescriptor),
    );

    const hasPendingAccountCreation = await connection.query(
      hasPendingCreateAccountTransferForStrategy(
        "open",
        connection.blockchainRid,
        sender.id,
        recipientId,
        asset.id,
        amount.value,
      ),
    );

    expect(hasPendingAccountCreation).toBeFalsy();
  });

  it("can recall unclaimed transfer after timeout has passed", async () => {
    const timeoutAsset = await addNewAssetIfNeeded(
      connection.client,
      "timeout_asset",
      "TIMEOUT_ASSET",
      5,
    );

    const keyPair = encryption.makeKeyPair();
    const recipientId = gtv.gtvHash(keyPair.pubKey);

    const account1 = await AccountBuilder.account(connection)
      .withBalance(timeoutAsset, 200)
      .withPoints(1)
      .build();

    const initialBalance = (await account1.getBalanceByAssetId(
      timeoutAsset.id,
    ))!.amount.value;

    const _allowedAssets = (await connection.query(
      allowedAssets(connection.blockchainRid, account1.id, recipientId),
    ))!;
    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(timeoutAsset.id),
    )?.min_amount;
    expect(rawAmount).toBeTruthy();
    const amount = createAmountFromBalance(rawAmount!, timeoutAsset.decimals);

    const { receipt } = await account1.transfer(
      recipientId,
      timeoutAsset.id,
      amount,
    );

    expect(
      (await account1.getBalanceByAssetId(timeoutAsset.id))!.amount.value,
    ).toBe(initialBalance - rawAmount!);
    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toContain("open");

    await account1.recallUnclaimedTransfer(receipt.transactionRid, 1);

    expect(
      (await account1.getBalanceByAssetId(timeoutAsset.id))!.amount.value,
    ).toBe(initialBalance);
    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);
  });

  it("can not recall unclaimed transfer before timeout has passed", async () => {
    const keyPair = encryption.makeKeyPair();
    const recipientId = gtv.gtvHash(keyPair.pubKey);

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const _allowedAssets = (await connection.query(
      allowedAssets(connection.blockchainRid, account1.id, recipientId),
    ))!;
    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.min_amount;
    expect(rawAmount).toBeTruthy();
    const amount = createAmountFromBalance(rawAmount!, asset.decimals);

    const { receipt } = await account1.transfer(recipientId, asset.id, amount);

    const strategies = await connection.query(
      pendingTransferStrategies(recipientId),
    );
    expect(strategies).toContain("open");

    await expect(
      account1.recallUnclaimedTransfer(receipt.transactionRid, 1),
    ).rejects.toThrow("This transfer has not timed out yet");
  });
});

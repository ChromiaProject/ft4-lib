import {
  AccountBuilder,
  addNewAssetIfNeeded,
  useChromiaNode,
} from "@ft4-test/util";
import {
  AnyAuthDescriptorRegistration,
  AuthenticatedAccount,
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts";
import {
  Amount,
  Asset,
  createAmount,
  createAmountFromBalance,
} from "@ft4/asset";
import { FtKeyStore, createInMemoryFtKeyStore } from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  PendingTransferExpirationState,
  allowedAssets,
  hasPendingCreateAccountTransferForStrategy,
  pendingTransferStrategies,
  registerAccount,
  registrationStrategy,
} from "@ft4/registration";
import { KeyPair, TxRejectedError, encryption, gtv } from "postchain-client";

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

  let keyPair: KeyPair;
  let recipientId: Buffer;
  let keyStore: FtKeyStore;
  let senderAccount: AuthenticatedAccount;
  let adToRegister: AnyAuthDescriptorRegistration;
  let defaultAmount: Amount;
  beforeEach(async () => {
    keyPair = encryption.makeKeyPair();
    recipientId = gtv.gtvHash(
      keyPair.pubKey,
      connection.client.config.merkleHashVersion,
    );
    keyStore = createInMemoryFtKeyStore(keyPair);
    senderAccount = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();
    adToRegister = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );
    defaultAmount = createAmount(100, asset.decimals);
  });

  async function getDynamicAmount(asset: Asset) {
    const _allowedAssets = (await connection.query(
      allowedAssets(connection.blockchainRid, senderAccount.id, recipientId),
    ))!;
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.min_amount;
    return createAmountFromBalance(rawAmount!, asset.decimals);
  }

  it("gets the whole transferred amount when account is registered", async () => {
    const amount = await getDynamicAmount(asset);

    await senderAccount.transfer(recipientId, asset.id, amount);

    const { session } = await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.transferOpen(adToRegister),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.value).toBe(amount.value);
  });

  it("cannot recall transferred assets after account is created", async () => {
    const amount = await getDynamicAmount(asset);

    const { receipt } = await senderAccount.transfer(
      recipientId,
      asset.id,
      amount,
    );

    await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.transferOpen(adToRegister),
    );

    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);

    await expect(
      senderAccount.recallUnclaimedTransfer(receipt.transactionRid, 1),
    ).rejects.toThrow("No pending transfer found");
  });

  it("can not register account without pending transfer", async () => {
    await expect(
      registerAccount(
        connection.client,
        keyStore,
        registrationStrategy.transferOpen(adToRegister),
      ),
    ).rejects.toThrow(TxRejectedError);
  });

  it("can find pending create account transfer when transfer is made and account registration is not completed", async () => {
    await senderAccount.transfer(recipientId, asset.id, defaultAmount);

    const hasPendingAccountCreation = await connection.query(
      hasPendingCreateAccountTransferForStrategy(
        "open",
        connection.blockchainRid,
        senderAccount.id,
        recipientId,
        asset.id,
        defaultAmount.value,
      ),
    );

    expect(hasPendingAccountCreation).toBeTruthy();
  });

  it("cannot find pending create account transfer when account registration is completed", async () => {
    await senderAccount.transfer(recipientId, asset.id, defaultAmount);

    await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.transferOpen(adToRegister),
    );

    const hasPendingAccountCreation = await connection.query(
      hasPendingCreateAccountTransferForStrategy(
        "open",
        connection.blockchainRid,
        senderAccount.id,
        recipientId,
        asset.id,
        defaultAmount.value,
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

    const account1 = await AccountBuilder.account(connection)
      .withBalance(timeoutAsset, 200)
      .withPoints(1)
      .build();

    const initialBalance = (await account1.getBalanceByAssetId(
      timeoutAsset.id,
    ))!.amount.value;

    const amount = await getDynamicAmount(timeoutAsset);

    const { receipt } = await account1.transfer(
      recipientId,
      timeoutAsset.id,
      amount,
    );

    expect(
      (await account1.getBalanceByAssetId(timeoutAsset.id))!.amount.value,
    ).toBe(initialBalance - amount.value);

    await account1.recallUnclaimedTransfer(receipt.transactionRid, 1);

    expect(
      (await account1.getBalanceByAssetId(timeoutAsset.id))!.amount.value,
    ).toBe(initialBalance);
    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);
  });

  it("can not recall unclaimed transfer before timeout has passed", async () => {
    const amount = await getDynamicAmount(asset);

    const { receipt } = await senderAccount.transfer(
      recipientId,
      asset.id,
      amount,
    );

    const strategies = await connection.query(
      pendingTransferStrategies(recipientId),
    );
    expect(strategies).toContain("open");

    await expect(
      senderAccount.recallUnclaimedTransfer(receipt.transactionRid, 1),
    ).rejects.toThrow("This transfer has not timed out yet");
  });

  describe("filters transfers from pendingTransferStrategies", () => {
    describe("filters valid transfers correctly", () => {
      let recipientId: Buffer;

      beforeAll(async () => {
        const keyPair = encryption.makeKeyPair();
        recipientId = gtv.gtvHash(
          keyPair.pubKey,
          connection.client.config.merkleHashVersion,
        );

        const account1 = await AccountBuilder.account(connection)
          .withBalance(asset, 200)
          .withPoints(1)
          .build();

        const _allowedAssets = (await connection.query(
          allowedAssets(connection.blockchainRid, account1.id, recipientId),
        ))!;
        const rawAmount = _allowedAssets.find((v) =>
          v.asset_id.equals(asset.id),
        )?.min_amount;
        const amount = createAmountFromBalance(rawAmount!, asset.decimals);

        await account1.transfer(recipientId, asset.id, amount);
      });

      // The transfer SHOULD be found

      it("finds valid with no filter", async () => {
        expect(
          await connection.query(pendingTransferStrategies(recipientId)),
        ).toContain("open");
      });

      it("finds valid with empty filter", async () => {
        expect(
          await connection.query(pendingTransferStrategies(recipientId, {})),
        ).toContain("open");
      });

      it("finds valid with null state", async () => {
        expect(
          await connection.query(
            pendingTransferStrategies(recipientId, { state: null }),
          ),
        ).toContain("open");
      });

      it("finds valid with 'valid' filter", async () => {
        expect(
          await connection.query(
            pendingTransferStrategies(recipientId, {
              state: [PendingTransferExpirationState.Valid],
            }),
          ),
        ).toContain("open");
      });

      it("finds valid with 'all' filter", async () => {
        expect(
          await connection.query(
            pendingTransferStrategies(recipientId, {
              state: [
                PendingTransferExpirationState.Valid,
                PendingTransferExpirationState.Expired,
              ],
            }),
          ),
        ).toContain("open");
      });

      // The transfer should NOT be found

      it("does not find valid with 'expired' filter", async () => {
        expect(
          await connection.query(
            pendingTransferStrategies(recipientId, {
              state: [PendingTransferExpirationState.Expired],
            }),
          ),
        ).toStrictEqual([]);
      });
    });

    describe("filters expired transfers correctly", () => {
      let recipientId: Buffer;

      beforeAll(async () => {
        const timeoutAsset = await addNewAssetIfNeeded(
          connection.client,
          "timeout_asset",
          "TIMEOUT_ASSET",
          5,
        );

        const keyPair = encryption.makeKeyPair();
        recipientId = gtv.gtvHash(
          keyPair.pubKey,
          connection.client.config.merkleHashVersion,
        );

        const account1 = await AccountBuilder.account(connection)
          .withBalance(timeoutAsset, 200)
          .withPoints(2)
          .build();

        const _allowedAssets = (await connection.query(
          allowedAssets(connection.blockchainRid, account1.id, recipientId),
        ))!;

        const rawAmountTimeout = _allowedAssets.find((v) =>
          v.asset_id.equals(timeoutAsset.id),
        )?.min_amount;
        const amountTimeout = createAmountFromBalance(
          rawAmountTimeout!,
          timeoutAsset.decimals,
        );

        await account1.transfer(recipientId, timeoutAsset.id, amountTimeout);
      });

      // The transfer SHOULD be found

      it("finds expired with no filter", async () => {
        expect(
          await connection.query(pendingTransferStrategies(recipientId)),
        ).toContain("open");
      });

      it("finds expired with empty filter", async () => {
        expect(
          await connection.query(pendingTransferStrategies(recipientId, {})),
        ).toContain("open");
      });

      it("finds expired with null state", async () => {
        expect(
          await connection.query(
            pendingTransferStrategies(recipientId, { state: null }),
          ),
        ).toContain("open");
      });

      it("finds expired with 'expired' filter", async () => {
        expect(
          await connection.query(
            pendingTransferStrategies(recipientId, {
              state: [PendingTransferExpirationState.Expired],
            }),
          ),
        ).toContain("open");
      });

      it("finds expired with 'all' filter", async () => {
        expect(
          await connection.query(
            pendingTransferStrategies(recipientId, {
              state: [
                PendingTransferExpirationState.Valid,
                PendingTransferExpirationState.Expired,
              ],
            }),
          ),
        ).toContain("open");
      });

      // The transfer should NOT be found

      it("does not find expired with 'valid' filter", async () => {
        expect(
          await connection.query(
            pendingTransferStrategies(recipientId, {
              state: [PendingTransferExpirationState.Valid],
            }),
          ),
        ).toStrictEqual([]);
      });
    });
  });
});

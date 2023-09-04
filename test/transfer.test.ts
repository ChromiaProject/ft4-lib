import { newSignatureProvider } from "postchain-client";
import {
  authDescriptor as ad,
  FlagsType,
} from "../client/lib/ft4/accounts/auth-descriptor";
import { createAmount } from "../client/lib/ft4/asset/amount";
import { Asset } from "../client/lib/ft4/asset/types";
import { createInMemoryFtKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import {
  createConnection,
  createKeyStoreInteractor,
} from "../client/lib/ft4/ft-session";
import AccountBuilder from "./util/account-builder";
import adminUser from "./util/admin_user";
import { getNewAsset, createChromiaClient } from "./util/blockchain-util";
import TestUser from "./util/test-user";
import { registerAccount } from "/ft4/admin/admin-op-functions";
import { Connection } from "/ft4/types";

let asset: Asset;
let connection: Connection;
const admin = adminUser();

describe("Transfer", () => {
  beforeAll(async () => {
    connection = createConnection(await createChromiaClient());
    asset = await getNewAsset(connection.client, undefined, undefined, 5);
  });

  it("should succeed when balance is higher than amount to transfer", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const assetBalance1 = await account1.getBalanceByAssetId(asset.id);
    const assetBalance2 = await account2.getBalanceByAssetId(asset.id);

    expect(assetBalance1.amount.eq(createAmount(190, asset.decimals))).toBe(
      true,
    );
    expect(assetBalance2.amount.eq(createAmount(10, asset.decimals))).toBe(
      true,
    );
  });

  it("fails when balance is lower than amount to transfer", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 5)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    const promise = account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it("should fail if auth descriptor doesn't have transfer rights", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withAuthFlags(FlagsType.Account)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    const promise = account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it("should succeed if transferring tokens to a multisig account", async () => {
    const user2 = TestUser();
    const user3 = TestUser();

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const authDescriptor = ad.create.multiSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      2,
      [user2.signatureProvider.pubKey, user3.signatureProvider.pubKey],
    ).andNoRules;

    await registerAccount(
      connection.client,
      admin.signatureProvider,
      authDescriptor,
    );

    const account2 = await createConnection(connection.client).getAccountById(
      authDescriptor.id,
    );

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const assetBalance1 = await account1.getBalanceByAssetId(asset.id);
    const assetBalance2 = await account2.getBalanceByAssetId(asset.id);

    expect(assetBalance1.amount.eq(createAmount(190, asset.decimals))).toBe(
      true,
    );
    expect(assetBalance2.amount.eq(createAmount(10, asset.decimals))).toBe(
      true,
    );
  });

  it("should succeed burning tokens", async () => {
    const keyPair = newSignatureProvider();

    const account = await AccountBuilder.account(connection)
      .withParticipant(keyPair)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const session = await createKeyStoreInteractor(
      await createChromiaClient(),
      createInMemoryFtKeyStore(keyPair),
    ).getSession(account.id);
    await session.account.burn(asset.id, createAmount(10, asset.decimals));
    const assetBalance = await session.account.getBalanceByAssetId(asset.id);

    expect(
      assetBalance.amount.eq(createAmount(190, asset.decimals)),
    ).toBeTruthy();
  });
});

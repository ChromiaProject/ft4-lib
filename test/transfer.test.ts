import { registerOp } from "../client/lib/ft3/account/account-dev-operations";
import {
  authDescriptor as ad,
  FlagsType,
} from "../client/lib/ft3/account/auth-descriptor";
import { Asset } from "../client/lib/ft3/asset/types";
import { ftUserSession } from "../client/lib/ft3/interfaces";
import AccountBuilder from "./util/account-builder";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import TestUser from "./util/test-user";

const POINTS_AT_ACCOUNT_CREATION = 1;
let _ft: ftUserSession;
let asset: Asset;

describe("Transfer", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    asset = await getNewAsset(_ft);
  });

  it("should succeed when balance is higher than amount to transfer", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    const account2 = await AccountBuilder.account(_ft).build();

    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      BigInt(10)
    );

    const assetBalance1 = await ft.get.balance.by.accountAndAssetId(
      account1.id,
      asset.id
    );
    const assetBalance2 = await ft.get.balance.by.accountAndAssetId(
      account2.id,
      asset.id
    );

    expect(assetBalance1.amount).toEqual(190);
    expect(assetBalance2.amount).toEqual(10);
  });

  it("should fail when balance is lower than amount to transfer", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 5)
      .withPoints(1 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    const account2 = await AccountBuilder.account(_ft).build();

    const promise = ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it("should fail if auth descriptor doesn't have transfer rights", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withAuthFlags([FlagsType.Account])
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(_ft).build();

    const promise = ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it("should succeed if transferring tokens to a multisig account", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);
    const user2 = TestUser();
    const user3 = TestUser();

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    const authDescriptor = ad.create.multiSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      2,
      [user2.signatureProvider.pubKey, user3.signatureProvider.pubKey]
    ).andNoRules;

    const tx = ft.get.gtxClient.newTransaction(ad.getSigners(authDescriptor));
    tx.addOperation(...registerOp(authDescriptor));
    await tx.sign(user2.signatureProvider);
    await tx.sign(user3.signatureProvider);
    await tx.post();

    await ft.account.token.transfer(
      account1.id,
      ad.getId(authDescriptor),
      asset.id,
      BigInt(10)
    );

    const assetBalance1 = await ft.get.balance.by.accountAndAssetId(
      account1.id,
      asset.id
    );
    const assetBalance2 = await ft.get.balance.by.accountAndAssetId(
      ad.getId(authDescriptor),
      asset.id
    );

    expect(assetBalance1.amount).toEqual(190);
    expect(assetBalance2.amount).toEqual(10);
  });

  it("should succeed burning tokens", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    await ft.account.token.burn(account.id, asset.id, BigInt(10));

    const assetBalance = await ft.get.balance.by.accountAndAssetId(
      account.id,
      asset.id
    );

    expect(assetBalance.amount).toEqual(190);
  });
});

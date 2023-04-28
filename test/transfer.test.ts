import { registerOp } from "../client/lib/ft3/account/account-dev-operations";
import {
  authDescriptor as ad,
  FlagsType,
} from "../client/lib/ft3/account/auth-descriptor";
import { amount } from "../client/lib/ft3/asset/amount";
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
    asset = await getNewAsset(_ft, undefined, 5);
  });

  it("should succeed when balance is higher than amount to transfer", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    const account2 = await AccountBuilder.account(
      _ft.changeUser(TestUser())
    ).build();

    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      amount.create(10, asset.decimals)
    );

    const assetBalance1 = await ft.get.balance.by.accountAndAssetId(
      account1.id,
      asset.id
    );
    const assetBalance2 = await ft.get.balance.by.accountAndAssetId(
      account2.id,
      asset.id
    );

    expect(assetBalance1.amount.eq(amount.create(190, asset.decimals))).toBe(
      true
    );
    expect(assetBalance2.amount.eq(amount.create(10, asset.decimals))).toBe(
      true
    );
  });

  it("should fail when balance is lower than amount to transfer", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 5)
      .withPoints(1 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    const account2 = await AccountBuilder.account(
      _ft.changeUser(TestUser())
    ).build();

    const promise = ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      amount.create(10, asset.decimals)
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

    const account2 = await AccountBuilder.account(
      _ft.changeUser(TestUser())
    ).build();

    const promise = ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      amount.create(10, asset.decimals)
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

    const tx = ft.get.gtxClient.newTransaction(authDescriptor.signers);
    tx.addOperation(...registerOp(authDescriptor));
    await tx.sign(user2.signatureProvider);
    await tx.sign(user3.signatureProvider);
    await tx.postAndWaitConfirmation();

    await ft.account.token.transfer(
      account1.id,
      authDescriptor.id,
      asset.id,
      amount.create(10, asset.decimals)
    );

    const assetBalance1 = await ft.get.balance.by.accountAndAssetId(
      account1.id,
      asset.id
    );
    const assetBalance2 = await ft.get.balance.by.accountAndAssetId(
      authDescriptor.id,
      asset.id
    );

    expect(assetBalance1.amount.eq(amount.create(190, asset.decimals))).toBe(
      true
    );
    expect(assetBalance2.amount.eq(amount.create(10, asset.decimals))).toBe(
      true
    );
  });

  it("should succeed burning tokens", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    await ft.account.token.burn(
      account.id,
      asset.id,
      amount.create(10, asset.decimals)
    );

    const assetBalance = await ft.get.balance.by.accountAndAssetId(
      account.id,
      asset.id
    );

    expect(assetBalance.amount.eq(amount.create(190, asset.decimals))).toBe(
      true
    );
  });
});

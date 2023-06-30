import { KeyPair } from "../client/lib/cryptoUtils";
import { registerOp } from "../client/lib/ft4/accounts/account-dev-operations";
import {
  authDescriptor as ad,
  FlagsType,
} from "../client/lib/ft4/accounts/auth-descriptor";
import { createAmount } from "../client/lib/ft4/asset/amount";
import { Asset } from "../client/lib/ft4/asset/types";
import { createInMemoryFTKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createKeyStoreInteractor } from "../client/lib/ft4/ft-session";
import { ftUserSession } from "../client/lib/ft4/types";
import AccountBuilder from "./util/account-builder";
import adminUser from "./util/admin_user";
import {
  getNewAsset,
  getUserSession,
  createChromiaClient,
} from "./util/blockchain-util";
import TestUser, { newSingleSigUser } from "./util/test-user";

const POINTS_AT_ACCOUNT_CREATION = 1;
let _ft: ftUserSession;
let asset: Asset;
const admin = adminUser();

describe("Transfer", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    asset = await getNewAsset(_ft, undefined, undefined, 5);
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
      createAmount(10, asset.decimals)
    );

    const assetBalance1 = await ft.get.balance.by.accountAndAssetId(
      account1.id,
      asset.id
    );
    const assetBalance2 = await ft.get.balance.by.accountAndAssetId(
      account2.id,
      asset.id
    );

    expect(assetBalance1.amount.eq(createAmount(190, asset.decimals))).toBe(
      true
    );
    expect(assetBalance2.amount.eq(createAmount(10, asset.decimals))).toBe(
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
      createAmount(10, asset.decimals)
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
      createAmount(10, asset.decimals)
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

    const tx = ft.get.gtxClient.newTransaction(
      authDescriptor.signers.concat(admin.authDescriptor.signers)
    );
    tx.addOperation(...registerOp(authDescriptor));
    await tx.sign(user2.signatureProvider);
    await tx.sign(user3.signatureProvider);
    await tx.sign(admin.signatureProvider);
    await tx.postAndWaitConfirmation();

    await ft.account.token.transfer(
      account1.id,
      authDescriptor.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    const assetBalance1 = await ft.get.balance.by.accountAndAssetId(
      account1.id,
      asset.id
    );
    const assetBalance2 = await ft.get.balance.by.accountAndAssetId(
      authDescriptor.id,
      asset.id
    );

    expect(assetBalance1.amount.eq(createAmount(190, asset.decimals))).toBe(
      true
    );
    expect(assetBalance2.amount.eq(createAmount(10, asset.decimals))).toBe(
      true
    );
  });

  it("should succeed burning tokens", async () => {
    const keyPair = new KeyPair();
    const user = newSingleSigUser(keyPair);
    const ft = _ft.changeUser(user);

    const account = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    const session = await createKeyStoreInteractor(
      await createChromiaClient(),
      createInMemoryFTKeyStore(keyPair)
    ).getSession(account.id);
    await session.account.burn(asset.id, createAmount(10, asset.decimals));
    const assetBalance = await session.account.getBalanceByAssetId(asset.id);

    expect(
      assetBalance.amount.eq(createAmount(190, asset.decimals))
    ).toBeTruthy();
  });
});

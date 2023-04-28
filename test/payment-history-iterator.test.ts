import TestUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { ftUserSession } from "../client/lib/ft3/interfaces";
import { Asset } from "../client/lib/ft3/asset/types";
import { LocalStorageMock } from "./util/util";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import { createPaymentHistoryStoreMemory } from "../client/lib/ft3/account/payment-history/payment-history-store-memory";
import { createNewPaymentHistoryStoreLocal } from "../client/lib/ft3/account/payment-history/payment-history-store-local";
import { amount } from "../client/lib/ft3/asset/amount";

let _ft: ftUserSession;
let asset: Asset;

describe("Payment history iterator", () => {
  beforeAll(async () => {
    global.localStorage = new LocalStorageMock();
    _ft = await getUserSession();
    asset = await getNewAsset(_ft);
  });

  it("should have one payment history entry when one transfer is made", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withBalance(asset, 200)
      .withPoints(1)
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

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      5
    );
    const paymentHistoryIterator =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    expect(paymentHistoryStore.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(1);

    const [entry] = paymentHistoryEntries;

    //expect(entry.other.length).toEqual(1); entry.other removed as per discussion
    //expect(entry.other.brid).toEqual(blockchain.id); entry no more holds brid
    expect(entry.isInput).toEqual(true);
    expect(entry.transferOutputArgs.length).toEqual(1);
    expect(entry.transferOutputArgs[0].accountId).toEqual(account2.id);
  });

  it("should have two payment history entries if two transfers made", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(2)
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
    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      amount.create(11, asset.decimals)
    );

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      5
    );
    const paymentHistoryIterator =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    expect(paymentHistoryStore.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(2);
  });

  it("should have two payment history entries when sender and receiver are the same", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    await ft.account.token.transfer(
      account.id,
      account.id,
      asset.id,
      amount.create(20, asset.decimals)
    );

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account.id,
      5
    );
    const paymentHistoryIterator =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    expect(paymentHistoryStore.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(2);

    const [entry1, entry2] = paymentHistoryEntries;

    expect(entry1.isInput).toEqual(false);
    //expect(entry1.other.length).toEqual(1);
    //expect(entry1.other[0].brid).toEqual(blockchain.id);
    expect(entry1.transferInputArgs.length).toEqual(1);
    expect(entry1.transferOutputArgs.length).toEqual(1);
    expect(entry1.transferInputArgs[0].accountId).toEqual(account.id);
    expect(entry1.transferOutputArgs[0].accountId).toEqual(account.id);

    expect(entry2.isInput).toEqual(true);
    expect(entry2.transferInputArgs.length).toEqual(1);
    expect(entry2.transferOutputArgs.length).toEqual(1);
    expect(entry2.transferInputArgs[0].accountId).toEqual(account.id);
    expect(entry2.transferOutputArgs[0].accountId).toEqual(account.id);
  });

  it("should have more than one page if number of entries is greater than page size", async () => {
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(4)
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
    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      amount.create(10, asset.decimals)
    );
    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      amount.create(10, asset.decimals)
    );
    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      amount.create(10, asset.decimals)
    );

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      2
    );

    expect(paymentHistoryStore.getPageCount()).toEqual(2);
  });

  it.skip("should have one payment history entries if one crosschain transfer is made", async () => {
    /*
    ~~~~~needs update when the crosschain transfer is finalized~~~~~
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const brid2 = generateId();
    const accountId2 = generateId();
    await account1.xcTransfer(brid2, accountId2, asset.id, 10);

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(account1.id, 5, ft.get.gtxClient)
    const paymentHistoryIterator = _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    expect(paymentHistoryStore.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(1);

    const [entry] = paymentHistoryEntries;

    expect(entry.other.length).toEqual(1);
    expect(entry.other[0].brid).toEqual(brid2);
    expect(entry.other[0].accountId).toEqual(accountId2);
    */
  });

  it.skip("should have two payment history entries if one crosschain transfer and one transfer is made", async () => {
    /*
    ~~~~~needs update when the crosschain transfer is finalized~~~~~
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account1 = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(2)
      .build();

    const account2 = await AccountBuilder.account(_ft.changeUser(TestUser())).build();

    await ft.account.token.transfer(account1.id, account2.id, asset.id, amount.create(10, asset.decimals));
    await account1.xcTransfer(generateId(), generateId(), asset.id, 10);

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(account1.id, 5, ft.get.gtxClient)
    const paymentHistoryIterator = _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    expect(paymentHistoryStore.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(2);
    */
  });

  describe("local storage store", () => {
    it("should have more than one page if number of entries is greater than page size", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);

      const account1 = await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .withBalance(asset, 200)
        .withPoints(4)
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
      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        amount.create(10, asset.decimals)
      );
      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        amount.create(10, asset.decimals)
      );
      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        amount.create(10, asset.decimals)
      );

      const paymentHistoryStore = await createNewPaymentHistoryStoreLocal(
        ft.get.gtxClient,
        account1.id,
        2
      );

      expect(paymentHistoryStore.getPageCount()).toEqual(2);
    });
  });
});

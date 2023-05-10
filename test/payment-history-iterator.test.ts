import TestUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { ftUserSession } from "../client/lib/ft3/interfaces";
import { Asset } from "../client/lib/ft3/asset/types";
import { LocalStorageMock } from "./util/util";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import { createPaymentHistoryStoreMemory } from "../client/lib/ft3/account/payment-history/payment-history-store-memory";
import { createNewPaymentHistoryStoreLocal } from "../client/lib/ft3/account/payment-history/payment-history-store-local";
import { PaymentHistoryType } from "/ft3/account/payment-history/types";

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
      BigInt(10)
    );

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      5,
      null
    );
    const paymentHistoryIterator =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    expect(paymentHistoryStore.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(1);

    const [entry] = paymentHistoryEntries;

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
      BigInt(10)
    );
    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      BigInt(11)
    );

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      5,
      null
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
      BigInt(20)
    );

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account.id,
      5,
      null
    );
    const paymentHistoryIterator =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    expect(paymentHistoryStore.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(2);

    const [entry1, entry2] = paymentHistoryEntries;

    expect(entry1.isInput).toEqual(false);
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
      BigInt(10)
    );
    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await ft.account.token.transfer(
      account1.id,
      account2.id,
      asset.id,
      BigInt(10)
    );

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      2,
      null
    );

    expect(paymentHistoryStore.getPageCount()).toEqual(2);
  });

  it("returns only sent transactions if that is specified", async () => {
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
      BigInt(10)
    );

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      5,
      PaymentHistoryType.Sent
    );
    const paymentHistoryIterator =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    expect(paymentHistoryStore.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(1);
    expect(paymentHistoryEntries[0].isInput).toEqual(true);
  });

  it("returns only recieved transactions if that is specified", async () => {
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
      BigInt(10)
    );

    const paymentHistoryStore1 = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      5,
      PaymentHistoryType.Received
    );
    const paymentHistoryIterator1 =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore1);
    const paymentHistoryEntries1 = await paymentHistoryIterator1.next();

    expect(paymentHistoryStore1.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries1.length).toEqual(0);

    const paymentHistoryStore2 = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account2.id,
      5,
      PaymentHistoryType.Received
    );
    const paymentHistoryIterator2 =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore2);
    const paymentHistoryEntries2 = await paymentHistoryIterator2.next();

    expect(paymentHistoryStore2.getPageCount()).toEqual(1);
    expect(paymentHistoryEntries2.length).toEqual(1);
    expect(paymentHistoryEntries2[0].isInput).toEqual(false);
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

    await ft.account.token.transfer(account1.id, account2.id, asset.id, BigInt(10));
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
        BigInt(10)
      );
      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        BigInt(10)
      );
      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        BigInt(10)
      );
      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        BigInt(10)
      );

      const paymentHistoryStore = await createNewPaymentHistoryStoreLocal(
        ft.get.gtxClient,
        account1.id,
        2,
        null
      );

      expect(paymentHistoryStore.getPageCount()).toEqual(2);
    });
  });
});

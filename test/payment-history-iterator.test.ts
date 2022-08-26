import TestUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import BlockchainUtil from "./util/blockchain-util";
import Asset from "../client/lib/ft3/user/asset";
import { generateId } from "./util/util";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import PaymentHistorySyncManager from "../client/lib/ft3/user/payment-history/payment-history-sync-manager";
import PaymentHistoryStoreLocalStorage from "../client/lib/ft3/user/payment-history/payment-history-store-local-storage";

let blockchain: Blockchain;
let asset: Asset;

describe("Payment history iterator", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
    asset = await BlockchainUtil.getNewAsset(blockchain);
  });

  it("should have one payment history entry when one transfer is made", async () => {
    const user = TestUser.singleSig();

    const account1 = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(blockchain).build();

    await account1.transfer(account2.id, asset.id, 10);

    const paymentHistoryIterator = await account1.getPaymentHistoryIterator(5);
    const paymentHistoryEntries = paymentHistoryIterator.next();

    expect(paymentHistoryIterator.pageCount).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(1);

    const [entry] = paymentHistoryEntries;

    expect(entry.other.length).toEqual(1);
    expect(entry.other[0].brid).toEqual(blockchain.id.toString("hex"));
    expect(entry.other[0].accountId).toEqual(account2.id.toString("hex"));
  });

  it("should have two payment history entries if two transfers made", async () => {
    const user = TestUser.singleSig();

    const account1 = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(2)
      .build();

    const account2 = await AccountBuilder.account(blockchain).build();

    await account1.transfer(account2.id, asset.id, 10);
    await account1.transfer(account2.id, asset.id, 11);

    const paymentHistoryIterator = await account1.getPaymentHistoryIterator(5);
    const paymentHistoryEntries = paymentHistoryIterator.next();

    expect(paymentHistoryIterator.pageCount).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(2);
  });

  it("should have two payment history entries when sender and receiver are the same", async () => {
    const user = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    await account.transfer(account.id, asset.id, 20);

    const paymentHistoryIterator = await account.getPaymentHistoryIterator(5);
    const paymentHistoryEntries = paymentHistoryIterator.next();

    expect(paymentHistoryIterator.pageCount).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(2);

    const [entry1, entry2] = paymentHistoryEntries;

    expect(entry1.isInput).toEqual(false);
    expect(entry1.other.length).toEqual(1);
    expect(entry1.other[0].brid).toEqual(blockchain.id.toString("hex"));
    expect(entry1.other[0].accountId).toEqual(account.id.toString("hex"));

    expect(entry2.isInput).toEqual(true);
    expect(entry2.other.length).toEqual(1);
    expect(entry2.other[0].brid).toEqual(blockchain.id.toString("hex"));
    expect(entry2.other[0].accountId).toEqual(account.id.toString("hex"));
  });

  it("should have more than one page if number of entries is greater than page size", async () => {
    const user = TestUser.singleSig();

    const account1 = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(4)
      .build();

    const account2 = await AccountBuilder.account(blockchain).build();

    await account1.transfer(account2.id, asset.id, 10);
    await account1.transfer(account2.id, asset.id, 10);
    await account1.transfer(account2.id, asset.id, 10);
    await account1.transfer(account2.id, asset.id, 10);

    const paymentHistoryIterator = await account1.getPaymentHistoryIterator(2);

    expect(paymentHistoryIterator.pageCount).toEqual(2);
  });

  it.skip("should have one payment history entries if one crosschain transfer is made", async () => {
    const user = TestUser.singleSig();

    const account1 = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const brid2 = generateId();
    const accountId2 = generateId();
    await account1.xcTransfer(brid2, accountId2, asset.id, 10);

    const paymentHistoryIterator = await account1.getPaymentHistoryIterator(5);
    const paymentHistoryEntries = paymentHistoryIterator.next();

    expect(paymentHistoryIterator.pageCount).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(1);

    const [entry] = paymentHistoryEntries;

    expect(entry.other.length).toEqual(1);
    expect(entry.other[0].brid).toEqual(brid2.toString("hex"));
    expect(entry.other[0].accountId).toEqual(accountId2.toString("hex"));
  });

  it.skip("should have two payment history entries if one crosschain transfer and one transfer is made", async () => {
    const user = TestUser.singleSig();

    const account1 = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 200)
      .withPoints(2)
      .build();

    const account2 = await AccountBuilder.account(blockchain).build();

    await account1.transfer(account2.id, asset.id, 10);
    await account1.xcTransfer(generateId(), generateId(), asset.id, 10);

    const paymentHistoryIterator = await account1.getPaymentHistoryIterator(5);
    const paymentHistoryEntries = paymentHistoryIterator.next();

    expect(paymentHistoryIterator.pageCount).toEqual(1);
    expect(paymentHistoryEntries.length).toEqual(2);
  });

  describe("local storage store", () => {
    it("should have more than one page if number of entries is greater than page size", async () => {
      PaymentHistorySyncManager.defaultPaymentHistoryStore =
        new PaymentHistoryStoreLocalStorage();

      const user = TestUser.singleSig();

      const account1 = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.signatureProvider])
        .withBalance(asset, 200)
        .withPoints(4)
        .build();

      const account2 = await AccountBuilder.account(blockchain).build();

      await account1.transfer(account2.id, asset.id, 10);
      await account1.transfer(account2.id, asset.id, 10);
      await account1.transfer(account2.id, asset.id, 10);
      await account1.transfer(account2.id, asset.id, 10);

      const paymentHistoryIterator = await account1.getPaymentHistoryIterator(
        2
      );

      expect(paymentHistoryIterator.pageCount).toEqual(2);
    });
  });
});

import TestUser, { newSingleSigUser } from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { ftUserSession } from "../client/lib/ft3/types";
import { Asset } from "../client/lib/ft3/asset/types";
import { LocalStorageMock } from "./util/util";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import { createPaymentHistoryStoreMemory } from "../client/lib/ft3/account/payment-history/payment-history-store-memory";
import { createNewPaymentHistoryStoreLocal } from "../client/lib/ft3/account/payment-history/payment-history-store-local";
import { createAmount } from "../client/lib/ft3/asset/amount";
import { PaymentHistoryType } from "/ft3/account/payment-history/types";
import { createConnection } from "/ft3/ft-session";
import { KeyPair } from "../client/lib/cryptoUtils";
import { createInMemoryFTKeyStore } from "../client/lib/ft3/authentication/ft/key-stores/in-memory";
import { createKeyStoreInteractor } from "../client/lib/ft3/ft-session";
import { createPaymentHistoryRetriever } from "/ft3/account/payment-history/payment-history-retrieval";

let _ft: ftUserSession;
let asset: Asset;

describe("Payment history", () => {
  beforeAll(async () => {
    global.localStorage = new LocalStorageMock();
    _ft = await getUserSession();
    asset = await getNewAsset(_ft);
  });
  describe("Payment history iterator", () => {
    it("should have two payment history entry when mint + transfer is made", async () => {
      const keyPair = new KeyPair();
      const user = newSingleSigUser(keyPair);
      const ft = _ft.changeUser(user);

      const account1 = await AccountBuilder.account(ft)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

      const account2 = await AccountBuilder.account(
        _ft.changeUser(TestUser())
      ).build();

      const session = await createKeyStoreInteractor(
        _ft.get.gtxClient,
        createInMemoryFTKeyStore(keyPair)
      ).getSession(account1.id);

      await session.account.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals)
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

      const [entry] = paymentHistoryEntries;

      expect(entry.isInput).toEqual(true);
      expect(entry.transferOutputArgs.length).toEqual(1);
      expect(entry.transferOutputArgs[0].accountId).toEqual(account2.id);
    });

    it("should have three payment history entries if mint + two transfers made", async () => {
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
        createAmount(10, asset.decimals)
      );
      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        createAmount(11, asset.decimals)
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
      expect(paymentHistoryEntries.length).toEqual(3);
    });

    it("should have three payment history entries when mint + transfer to self", async () => {
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
        createAmount(20, asset.decimals)
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
      expect(paymentHistoryEntries.length).toEqual(3);

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
        createAmount(10, asset.decimals)
      );
      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        createAmount(10, asset.decimals)
      );

      const paymentHistoryStore = await createPaymentHistoryStoreMemory(
        ft.get.gtxClient,
        account1.id,
        2,
        null
      );

      expect(paymentHistoryStore.getPageCount()).toEqual(2);
    });

    it("is possible to get payment history from via the IAccount interface", async () => {
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
        createAmount(10, asset.decimals)
      );

      const connection = createConnection(_ft.get.gtxClient);
      const foundAccount = await connection.getAccountById(account1.id);
      const history = await foundAccount.getTransferHistory();
      expect(history.data.length).toStrictEqual(2);
      expect(history.data[0].transferInputArgs.length).toBe(1);
      expect(history.data[0].transferInputArgs[0].accountId).toEqual(
        account1.id
      );
      expect(history.data[0].transferInputArgs[0].amount.value).toEqual(
        createAmount(10, asset.decimals).value
      );
      expect(history.data[0].transferOutputArgs.length).toBe(1);
      expect(history.data[0].transferOutputArgs[0].accountId).toEqual(
        account2.id
      );
      expect(history.data[0].transferOutputArgs[0].amount.value).toEqual(
        createAmount(10, asset.decimals).value
      );
    });

    it.skip("should have one payment history entriey if one crosschain transfer is made", async () => {
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
  
      await ft.account.token.transfer(account1.id, account2.id, asset.id, createAmount(10, asset.decimals));
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
          createAmount(10, asset.decimals)
        );
        await ft.account.token.transfer(
          account1.id,
          account2.id,
          asset.id,
          createAmount(10, asset.decimals)
        );
        await ft.account.token.transfer(
          account1.id,
          account2.id,
          asset.id,
          createAmount(10, asset.decimals)
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

  it("returns only sent transactions if that is specified", async () => {
    const account1 = await AccountBuilder.account(_ft.changeUser(TestUser()))
      .withBalance(asset, 200)
      .withPoints(1)
      .buildAuthenticated();

    const account2 = await AccountBuilder.account(
      _ft.changeUser(TestUser())
    ).buildAuthenticated();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(5, asset.decimals)
    );

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(15, asset.decimals)
    );

    await account2.transfer(
      account1.id,
      asset.id,
      createAmount(15, asset.decimals)
    );

    const transferHistory = await account1.getTransferHistory(10, {
      paymentHistoryType: PaymentHistoryType.Sent,
    });

    expect(transferHistory.data.length).toEqual(3);
  });

  it("returns only received transactions if that is specified", async () => {
    const account1 = await AccountBuilder.account(_ft.changeUser(TestUser()))
      .withBalance(asset, 200)
      .withPoints(1)
      .buildAuthenticated();

    const account2 = await AccountBuilder.account(
      _ft.changeUser(TestUser())
    ).buildAuthenticated();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(15, asset.decimals)
    );

    await account2.transfer(
      account1.id,
      asset.id,
      createAmount(20, asset.decimals)
    );

    const transferHistory = await account2.getTransferHistory(5, {
      paymentHistoryType: PaymentHistoryType.Received,
    });

    expect(transferHistory.data.length).toEqual(2);
  });

  it("fetches a payment history entry by rowid", async () => {
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
      createAmount(10, asset.decimals)
    );

    const retreiver = createPaymentHistoryRetriever(
      ft.get.gtxClient,
      account1.id
    );
    const expectedEntry = (await retreiver.retrieve(1, null, null)).data[0];
    const actualEntry = await retreiver.retrieveSingle(
      parseInt(expectedEntry.rowid, 10)
    );

    Object.assign(BigInt.prototype, {
      toJSON: function () {
        return this.toString();
      },
    });

    expect(JSON.stringify(actualEntry)).toStrictEqual(
      JSON.stringify(expectedEntry)
    );
  });

  it("is possible to get a single entry from IAccount interface", async () => {
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
      createAmount(10, asset.decimals)
    );

    const connection = createConnection(_ft.get.gtxClient);
    const foundAccount = await connection.getAccountById(account1.id);

    const paymentHistoryStore = await createPaymentHistoryStoreMemory(
      ft.get.gtxClient,
      account1.id,
      5,
      {
        paymentHistoryType: PaymentHistoryType.Sent,
      }
    );
    const paymentHistoryIterator =
      _ft.get.account.paymentHistory.iterator(paymentHistoryStore);
    const paymentHistoryEntries = await paymentHistoryIterator.next();

    const entry = await foundAccount.getTransferHistoryEntry(
      parseInt(paymentHistoryEntries[0].rowid, 10)
    );
    expect(entry.rowid).toBe(paymentHistoryEntries[0].rowid);
  });
});

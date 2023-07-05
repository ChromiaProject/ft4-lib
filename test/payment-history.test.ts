import TestUser, { newSingleSigUser } from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { Connection, ftUserSession } from "../client/lib/ft4/types";
import { Asset } from "../client/lib/ft4/asset/types";
import { LocalStorageMock } from "./util/util";
import {
  createChromiaClient,
  getNewAsset,
  getUserSession,
} from "./util/blockchain-util";
import { createAmount } from "../client/lib/ft4/asset/amount";
import { PaymentHistoryType } from "../client/lib/ft4/accounts/payment-history/types";
import {
  createConnection,
  createKeyStoreInteractor,
} from "../client/lib/ft4/ft-session";
import { KeyPair } from "../client/lib/cryptoUtils";
import { createInMemoryFtKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createPaymentHistoryRetriever } from "../client/lib/ft4/accounts/payment-history/payment-history-retrieval";
import { IClient, gtv } from "postchain-client";

let _ft: ftUserSession;
let asset: Asset;
let connection: Connection;
let client: IClient;
const NULL_ACCOUNT = gtv.encode(null);

describe("Payment history", () => {
  beforeAll(async () => {
    global.localStorage = new LocalStorageMock();
    _ft = await getUserSession();
    client = await createChromiaClient();
    asset = await getNewAsset(client);
    connection = createConnection(client);
  });
  describe("Payment history iterator", () => {
    it("should have one payment history entry when mint is made", async () => {
      const keyPair = new KeyPair();
      const user = newSingleSigUser(keyPair);
      const ft = _ft.changeUser(user);

      const account1 = await AccountBuilder.account(ft)
        .withBalance(asset, 200)
        .withPoints(1)
        .buildAuthenticated();

      const history = await account1.getTransferHistory();

      expect(history.data.length).toEqual(1);
      expect(history.nextCursor).toEqual(null);

      const entry = history.data[0];

      expect(entry.isInput).toEqual(false);
      expect(entry.transferInputArgs.length).toEqual(1);
      expect(entry.transferOutputArgs.length).toEqual(1);
      expect(entry.transferInputArgs[0].accountId).toEqual(NULL_ACCOUNT);
      expect(entry.transferOutputArgs[0].accountId).toEqual(account1.id);
    });

    it("should have two payment history entry when mint + transfer is made", async () => {
      const keyPair = new KeyPair();
      const user = newSingleSigUser(keyPair);
      const ft = _ft.changeUser(user);

      const account1 = await AccountBuilder.account(ft)
        .withBalance(asset, 200)
        .withPoints(1)
        .buildAuthenticated();

      const account2 = await AccountBuilder.account(
        _ft.changeUser(TestUser())
      ).build();

      const session = await createKeyStoreInteractor(
        connection.client,
        createInMemoryFtKeyStore(keyPair)
      ).getSession(account1.id);

      await session.account.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals)
      );

      const history = await account1.getTransferHistory();

      expect(history.data.length).toEqual(2);
      expect(history.nextCursor).toEqual(null);

      const entry = history.data[0];

      expect(entry.isInput).toEqual(true);
      expect(entry.transferOutputArgs.length).toEqual(1);
      expect(entry.transferOutputArgs[0].accountId).toEqual(account2.id);
    });

    it("includes the name of the operation causing the history entry", async () => {
      const keyPair = new KeyPair();
      const user = newSingleSigUser(keyPair);
      const ft = _ft.changeUser(user);

      const account1 = await AccountBuilder.account(ft)
        .withBalance(asset, 200)
        .withPoints(1)
        .buildAuthenticated();

      const account2 = await AccountBuilder.account(
        _ft.changeUser(TestUser())
      ).build();

      await account1.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals)
      );

      const paymentHistoryEntries = await account1.getTransferHistory();

      const [transferEntry, mintEntry] = paymentHistoryEntries.data;

      expect(mintEntry.operationName).toEqual("ft4.admin.mint");
      expect(transferEntry.operationName).toEqual("ft4.transfer_one");
    });

    it("should have three payment history entries if mint + two transfers made", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);

      const account1 = await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .withBalance(asset, 200)
        .withPoints(2)
        .buildAuthenticated();

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

      const history = await account1.getTransferHistory();

      expect(history.data.length).toEqual(3);
      expect(history.nextCursor).toEqual(null);
    });

    it("should have three payment history entries when mint + transfer to self", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);

      const account = await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .withBalance(asset, 200)
        .withPoints(1)
        .buildAuthenticated();

      await ft.account.token.transfer(
        account.id,
        account.id,
        asset.id,
        createAmount(20, asset.decimals)
      );

      const history = await account.getTransferHistory();

      expect(history.data.length).toEqual(3);
      expect(history.nextCursor).toEqual(null);

      const [entry1, entry2, mintEntry] = history.data;

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

      expect(mintEntry.isInput).toEqual(false);
      expect(mintEntry.transferInputArgs.length).toEqual(1);
      expect(mintEntry.transferOutputArgs.length).toEqual(1);
      expect(mintEntry.transferInputArgs[0].accountId).toEqual(NULL_ACCOUNT);
      expect(mintEntry.transferOutputArgs[0].accountId).toEqual(account.id);
    });

    it("should have more than one page if number of entries is greater than page size", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);

      const account1 = await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .withBalance(asset, 200)
        .withPoints(4)
        .buildAuthenticated();

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

      const history = await account1.getTransferHistory(2);

      expect(history.data.length).toEqual(2);
      expect(history.nextCursor).not.toBeNull();
    });

    it("is possible to get payment history from via the IAccount interface", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);

      const account1 = await AccountBuilder.account(ft)
        .withBalance(asset, 200)
        .withPoints(1)
        .buildAuthenticated();

      const account2 = await AccountBuilder.account(
        _ft.changeUser(TestUser())
      ).build();

      await ft.account.token.transfer(
        account1.id,
        account2.id,
        asset.id,
        createAmount(10, asset.decimals)
      );

      const history = await account1.getTransferHistory();
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
      connection.client,
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

    const foundAccount = await connection.getAccountById(account1.id);

    const history = await foundAccount.getTransferHistory();

    const entry = await foundAccount!.getTransferHistoryEntry(
      parseInt(history.data[0].rowid, 10)
    );
    expect(entry!.rowid).toBe(history.data[0].rowid);
  });
});

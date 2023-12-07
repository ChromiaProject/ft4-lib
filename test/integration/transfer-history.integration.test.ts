import TestUser from "../util/test-user";
import AccountBuilder from "../util/account-builder";
import { Connection } from "/ft4/types";
import { Asset } from "/ft4/asset/types";
import { LocalStorageMock } from "../util/util";
import { createChromiaClient, getNewAsset } from "../util/blockchain-util";
import { createAmount } from "/ft4/asset/amount";
import { TransferHistoryType } from "/ft4/accounts/transfer-history/types";
import { createConnection, createKeyStoreInteractor } from "/ft4/ft-session";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { IClient, gtv, newSignatureProvider } from "postchain-client";
import { createTransferHistoryRetriever } from "/ft4/accounts/transfer-history/transfer-history-retrieval";

let asset: Asset;
let connection: Connection;
let client: IClient;
const NULL_ACCOUNT = gtv.encode(null);

describe("Transfer history", () => {
  beforeAll(async () => {
    global.localStorage = new LocalStorageMock();
    client = await createChromiaClient();
    asset = await getNewAsset(client);
    connection = createConnection(client);
  });
  describe("Transfer history iterator", () => {
    it("should have one transfer history entry when mint is made", async () => {
      const keyPair = newSignatureProvider();

      const account1 = await AccountBuilder.account(connection)
        .withParticipant(keyPair)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

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

    it("should have two transfer history entry when mint + transfer is made", async () => {
      const keyPair = newSignatureProvider();

      const account1 = await AccountBuilder.account(connection)
        .withParticipant(keyPair)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

      const account2 = await AccountBuilder.account(connection).build();

      const session = await createKeyStoreInteractor(
        connection.client,
        createInMemoryFtKeyStore(keyPair),
      ).getSession(account1.id);

      await session.account.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals),
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
      const keyPair = newSignatureProvider();

      const account1 = await AccountBuilder.account(connection)
        .withParticipant(keyPair)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

      const account2 = await AccountBuilder.account(connection).build();

      await account1.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals),
      );

      const transferHistoryEntries = await account1.getTransferHistory();

      const [transferEntry, mintEntry] = transferHistoryEntries.data;

      expect(mintEntry.operationName).toEqual("ft4.admin.mint");
      expect(transferEntry.operationName).toEqual("ft4.transfer");
    });

    it("should have three transfer history entries if mint + two transfers made", async () => {
      const user = TestUser();

      const account1 = await AccountBuilder.account(connection)
        .withParticipant(user.signatureProvider)
        .withBalance(asset, 200)
        .withPoints(2)
        .build();

      const account2 = await AccountBuilder.account(connection).build();

      await account1.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals),
      );
      await account1.transfer(
        account2.id,
        asset.id,
        createAmount(11, asset.decimals),
      );

      const history = await account1.getTransferHistory();

      expect(history.data.length).toEqual(3);
      expect(history.nextCursor).toEqual(null);
    });

    it("should have more than one page if number of entries is greater than page size", async () => {
      const user = TestUser();

      const account1 = await AccountBuilder.account(connection)
        .withParticipant(user.signatureProvider)
        .withBalance(asset, 200)
        .withPoints(4)
        .build();

      const account2 = await AccountBuilder.account(connection).build();

      await account1.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals),
      );
      await account1.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals),
      );

      const history = await account1.getTransferHistory(2);

      expect(history.data.length).toEqual(2);
      expect(history.nextCursor).not.toBeNull();
    });

    it("is possible to get transfer history from via the IAccount interface", async () => {
      const user = TestUser();

      const account1 = await AccountBuilder.account(connection)
        .withParticipant(user.signatureProvider)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

      const account2 = await AccountBuilder.account(connection).build();

      await account1.transfer(
        account2.id,
        asset.id,
        createAmount(10, asset.decimals),
      );

      const history = await account1.getTransferHistory();
      expect(history.data.length).toStrictEqual(2);
      expect(history.data[0].transferInputArgs.length).toBe(1);
      expect(history.data[0].transferInputArgs[0].accountId).toEqual(
        account1.id,
      );
      expect(history.data[0].transferInputArgs[0].amount.value).toEqual(
        createAmount(10, asset.decimals).value,
      );
      expect(history.data[0].transferOutputArgs.length).toBe(1);
      expect(history.data[0].transferOutputArgs[0].accountId).toEqual(
        account2.id,
      );
      expect(history.data[0].transferOutputArgs[0].amount.value).toEqual(
        createAmount(10, asset.decimals).value,
      );
    });
  });

  it("returns only sent transactions if that is specified", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(5, asset.decimals),
    );

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(15, asset.decimals),
    );

    await account2.transfer(
      account1.id,
      asset.id,
      createAmount(15, asset.decimals),
    );

    const transferHistory = await account1.getTransferHistory(10, {
      transferHistoryType: TransferHistoryType.Sent,
    });

    expect(transferHistory.data.length).toEqual(3);
  });

  it("returns only received transactions if that is specified", async () => {
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

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(15, asset.decimals),
    );

    await account2.transfer(
      account1.id,
      asset.id,
      createAmount(20, asset.decimals),
    );

    const transferHistory = await account2.getTransferHistory(5, {
      transferHistoryType: TransferHistoryType.Received,
    });

    expect(transferHistory.data.length).toEqual(2);
  });

  it("fetches a transfer history entry by rowid", async () => {
    const user = TestUser();

    const account1 = await AccountBuilder.account(connection)
      .withParticipant(user.signatureProvider)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const retreiver = createTransferHistoryRetriever(
      connection.client,
      account1.id,
    );
    const expectedEntry = (await retreiver.retrieve(1, null, null)).data[0];
    const actualEntry = await retreiver.retrieveSingle(expectedEntry.rowid);

    Object.assign(BigInt.prototype, {
      toJSON: function () {
        return this.toString();
      },
    });

    expect(JSON.stringify(actualEntry)).toStrictEqual(
      JSON.stringify(expectedEntry),
    );
  });

  it("is possible to get a single entry from IAccount interface", async () => {
    const user = TestUser();

    const account1 = await AccountBuilder.account(connection)
      .withParticipant(user.signatureProvider)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const foundAccount = await connection.getAccountById(account1.id);

    const history = await foundAccount!.getTransferHistory();

    const entry = await foundAccount!.getTransferHistoryEntry(
      history.data[0].rowid,
    );
    expect(entry!.rowid).toBe(history.data[0].rowid);
  });
});

import TestUser from "../util/test-user";
import AccountBuilder from "../util/account-builder";
import { Connection } from "@ft4/types";
import { Asset } from "@ft4/asset/types";
import { LocalStorageMock } from "../util/util";
import { getNewAsset } from "../util/blockchain-util";
import { createAmount } from "@ft4/asset/amount";
import { TransferHistoryType } from "@ft4/accounts/transfer-history/types";
import { createConnection, createKeyStoreInteractor } from "@ft4/ft-session";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import { IClient, newSignatureProvider } from "postchain-client";
import { useChromiaNode } from "@ft4/util/chromia-node";
import { TransferDetail } from "@ft4/accounts";
import { getTransferHistoryFromHeight } from "@ft4/accounts/transfer-history/transfer-history-query-functions";

let asset: Asset;
let connection: Connection;
let client: IClient;

describe("Transfer history", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    global.localStorage = new LocalStorageMock();
    client = getClient();
    asset = await getNewAsset(
      client,
      "transfer_history_1",
      "TRANSFER_HISTORY_1",
    );
    connection = createConnection(client);
  });

  describe("Transfer history iterator", () => {
    it("should have one transfer history entry when mint is made", async () => {
      const keyPair = newSignatureProvider();

      const account1 = await AccountBuilder.account(connection)
        .withSigner(keyPair)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

      const history = await account1.getTransferHistory();

      expect(history.data.length).toEqual(1);
      expect(history.nextCursor).toEqual(null);

      const entry = history.data[0];

      expect(entry.isInput).toEqual(false);
    });

    it("should have two transfer history entry when mint + transfer is made", async () => {
      const keyPair = newSignatureProvider();

      const account1 = await AccountBuilder.account(connection)
        .withSigner(keyPair)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

      const account2 = await AccountBuilder.account(connection).build();

      const session = await createKeyStoreInteractor(
        connection.client,
        createInMemoryFtKeyStore(keyPair),
      ).getSession(account1.id);

      const transferTransactionRid = (
        await session.account.transfer(
          account2.id,
          asset.id,
          createAmount(10, asset.decimals),
        )
      ).receipt.transactionRid;

      const history = await account1.getTransferHistory();

      expect(history.data.length).toEqual(2);
      expect(history.nextCursor).toEqual(null);

      const entry = history.data[0];

      expect(entry.isInput).toEqual(true);
      expect(entry.opIndex).toEqual(1);
      const expectedDetails: TransferDetail[] = [
        {
          accountId: account1.id,
          assetId: asset.id,
          delta: 10n,
          isInput: true,
        },
        {
          accountId: account2.id,
          assetId: asset.id,
          delta: 10n,
          isInput: false,
        },
      ];
      expect(
        await connection.getTransferDetails(
          transferTransactionRid,
          entry.opIndex,
        ),
      ).toEqual(expectedDetails);
      expect(
        await connection.getTransferDetailsByAsset(
          transferTransactionRid,
          entry.opIndex,
          asset.id,
        ),
      ).toEqual(expectedDetails);
    });

    it("includes the name of the operation causing the history entry", async () => {
      const keyPair = newSignatureProvider();

      const account1 = await AccountBuilder.account(connection)
        .withSigner(keyPair)
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
        .withSigner(user.signatureProvider)
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
        .withSigner(user.signatureProvider)
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
        .withSigner(user.signatureProvider)
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

  it("is possible to get a single entry from IAccount interface", async () => {
    const user = TestUser();

    const account1 = await AccountBuilder.account(connection)
      .withSigner(user.signatureProvider)
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

  it("returns only transfers for specific asset", async () => {
    const asset2 = await getNewAsset(
      client,
      "transfer_history_2",
      "TRANSFER_HISTORY_2",
    );

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withBalance(asset2, 100)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(20, asset.decimals),
    );

    await account1.transfer(
      account2.id,
      asset2.id,
      createAmount(15, asset2.decimals),
    );

    await account2.transfer(
      account1.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const transferHistory = await getTransferHistoryFromHeight(
      connection,
      0,
      asset2.id,
      10,
      null,
    );

    expect(transferHistory.data.length).toEqual(3);
  });
});

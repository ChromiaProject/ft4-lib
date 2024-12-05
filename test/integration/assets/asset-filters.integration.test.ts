import { AccountBuilder, getNewAsset, useChromiaNode } from "@ft4-test/util";
import { Asset, getBalanceByAccountId } from "@ft4/asset";
import {
  AssetFilters,
  BalanceFilters,
  CrosschainTransferHistoryEntriesFilters,
  TransferHistoryEntriesFilters,
} from "@ft4/asset/types";
import { Connection, createConnection } from "@ft4/ft-session";
import { IClient } from "postchain-client";

let client: IClient;
let connection: Connection;

function setAssetFilters(
  rowids: Array<number> = [],
  id: Buffer | null = null,
  name: string | null = null,
  symbol: string | null = null,
  type: string | null = null,
): AssetFilters {
  return { rowids, id, name, symbol, type };
}

function setBalanceFilters(
  rowids: Array<number> = [],
  account_id: Buffer | null = null,
  asset_id: Buffer | null = null,
): BalanceFilters {
  return { rowids, account_id, asset_id };
}

function setCrosschainAndTransferHistoryEntryFilters(
  rowids: Array<number> = [],
  account_id: Buffer | null = null,
  asset_id: Buffer | null = null,
  transaction_rid: Buffer | null = null,
  op_index: number | null = null,
): TransferHistoryEntriesFilters | CrosschainTransferHistoryEntriesFilters {
  return { rowids, account_id, asset_id, transaction_rid, op_index };
}

describe("Asset queries using filters", () => {
  const getClient = useChromiaNode();
  const mockBuffer = Buffer.alloc(32);
  const mockString = "mockString";
  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
  });
  describe("getAssets", () => {
    it("returns empty pagination without filters", async () => {
      const { data } = await connection.getAssets(null, 1);

      const foundAsset = data.find((item) => item.rowId === 999) ?? null;
      expect(foundAsset).toBe(null);
    });
    it("returns empty pagination with filters", async () => {
      const { data } = await connection.getAssets(
        setAssetFilters([0], mockBuffer, mockString, mockString, mockString),
        1,
      );

      expect(data.length).toBe(0);
    });
    it("returns paginated assets without filters", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_without_filters_0",
        "ASSET_PAGINATED_WITHOUT_FILTERS_0",
      );
      const { data } = await connection.getAssets(null, 100);
      const foundAsset = data.find(
        (item) => item.id.toString("hex") === asset.id.toString("hex"),
      );

      expect(JSON.stringify(foundAsset)).toStrictEqual(
        JSON.stringify({
          rowId: asset.rowId,
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol,
          decimals: asset.decimals,
          blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
          iconUrl: asset.iconUrl,
          type: asset.type,
          supply: asset.supply,
        }),
      );
    });
    it("returns paginated assets with filters", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_with_filters_1",
        "ASSET_PAGINATED_WITH_FILTERS_1",
      );
      const { data } = await connection.getAssets(
        setAssetFilters(
          [asset.rowId!],
          asset.id,
          asset.name,
          asset.symbol,
          asset.type,
        ),
        1,
      );
      const foundAsset = data.find(
        (item) => item.id.toString("hex") === asset.id.toString("hex"),
      );

      expect(foundAsset).toMatchObject({
        rowId: asset.rowId,
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        decimals: asset.decimals,
        blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
        iconUrl: asset.iconUrl,
        type: asset.type,
        supply: asset.supply,
      });
    });
  });
  describe("getBalances", () => {
    it("returns empty pagination without filters", async () => {
      const { data } = await connection.getBalances(null, 1);

      const foundBalance = data.find((item) => item.rowId === 999) ?? null;
      expect(foundBalance).toBe(null);
    });
    it("returns empty pagination with filters", async () => {
      const { data } = await connection.getBalances(
        setBalanceFilters([0], mockBuffer, mockBuffer),
        1,
      );

      expect(data.length).toBe(0);
    });
    it("returns paginated balances without filters", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_without_filters_2",
        "ASSET_PAGINATED_WITHOUT_FILTERS_2",
      );
      const account = await AccountBuilder.account(connection)
        .withBalance(asset, 200)
        .build();

      const balance = await account.getBalanceByAssetId(asset.id);
      const { data } = await connection.getBalances(null, 100);
      const foundBalance = data.find(
        (item) =>
          item.asset.id.toString("hex") === balance!.asset.id.toString("hex"),
      );

      expect(JSON.stringify(foundBalance)).toStrictEqual(
        JSON.stringify({
          rowId: balance?.rowId,
          asset: {
            rowId: asset.rowId,
            id: asset.id,
            name: asset.name,
            symbol: asset.symbol,
            decimals: asset.decimals,
            blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
            iconUrl: asset.iconUrl,
            type: asset.type,
            supply: BigInt(200),
          },
          amount: balance!.amount,
        }),
      );
    });
    it("returns paginated balances with filters", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_with_filters_3",
        "ASSET_PAGINATED_WITH_FILTERS_3",
      );
      const account = await AccountBuilder.account(connection)
        .withBalance(asset, 200)
        .build();

      const balance = await getBalanceByAccountId(
        connection,
        account.id,
        asset.id,
      );

      const { data } = await connection.getBalances(
        setBalanceFilters([balance!.rowId!], account.id, balance!.asset.id),
        100,
      );

      const foundBalance = data.find(
        (item) =>
          item.asset.id.toString("hex") === balance!.asset.id.toString("hex"),
      );

      expect(JSON.stringify(foundBalance)).toStrictEqual(
        JSON.stringify({
          rowId: balance?.rowId,
          asset: {
            rowId: asset.rowId,
            id: asset.id,
            name: asset.name,
            symbol: asset.symbol,
            decimals: asset.decimals,
            blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
            iconUrl: asset.iconUrl,
            type: asset.type,
            supply: BigInt(200),
          },
          amount: balance!.amount,
        }),
      );
    });
  });
  describe("getTransferHistoryEntries", () => {
    it("returns empty pagination without filters", async () => {
      const { data } = await connection.getTransferHistoryEntries(null, 10);

      const foundTransferHistoryEntry =
        data.find((item) => item.rowid === 999) ?? null;
      expect(foundTransferHistoryEntry).toBe(null);
    });
    it("returns empty pagination with filters", async () => {
      const { data } = await connection.getTransferHistoryEntries(
        setCrosschainAndTransferHistoryEntryFilters(
          [0],
          mockBuffer,
          mockBuffer,
          mockBuffer,
          0,
        ),
        1,
      );

      expect(data.length).toBe(0);
    });
    it("returns paginated transfer history entries without filters", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_without_filters_4",
        "ASSET_PAGINATED_WITHOUT_FILTERS_4",
      );
      const senderAccount = await AccountBuilder.account(connection)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

      const recipientAccount = await AccountBuilder.account(connection).build();
      const balance = await senderAccount.getBalanceByAssetId(asset.id);
      await senderAccount.transfer(
        recipientAccount.id,
        asset.id,
        balance!.amount,
      );

      const senderHistory = await senderAccount.getTransferHistory();
      const senderTransferHistoryEntry =
        await senderAccount.getTransferHistoryEntry(
          senderHistory.data[0].rowid,
        );

      const { data } = await connection.getTransferHistoryEntries(null, 100);

      const foundTransferHistoryEntry = data.find(
        (item) => item.rowid === senderTransferHistoryEntry?.rowid,
      );

      expect(JSON.stringify(foundTransferHistoryEntry)).toStrictEqual(
        JSON.stringify({
          rowid: senderTransferHistoryEntry!.rowid,
          isInput: senderTransferHistoryEntry!.isInput,
          delta: senderTransferHistoryEntry!.delta,
          asset: {
            rowId: asset.rowId,
            id: asset.id,
            name: asset.name,
            symbol: asset.symbol,
            decimals: asset.decimals,
            blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
            iconUrl: asset.iconUrl,
            type: asset.type,
            supply: BigInt(200),
          },
          data: senderTransferHistoryEntry!.data,
          timestamp: senderTransferHistoryEntry!.timestamp,
          transactionId: senderTransferHistoryEntry!.transactionId,
          blockHeight: senderTransferHistoryEntry!.blockHeight,
          operationName: senderTransferHistoryEntry!.operationName,
          opIndex: senderTransferHistoryEntry!.opIndex,
          isCrosschain: senderTransferHistoryEntry!.isCrosschain,
        }),
      );
    });
    it("returns paginated transfer history entries with filters", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_with_filters_5",
        "ASSET_PAGINATED_WITH_FILTERS_5",
      );
      const senderAccount = await AccountBuilder.account(connection)
        .withBalance(asset, 200)
        .withPoints(1)
        .build();

      const recipientAccount = await AccountBuilder.account(connection).build();
      const balance = await senderAccount.getBalanceByAssetId(asset.id);
      await senderAccount.transfer(
        recipientAccount.id,
        asset.id,
        balance!.amount,
      );

      const senderHistory = await senderAccount.getTransferHistory();

      const senderTransferHistoryEntry =
        await senderAccount.getTransferHistoryEntry(
          senderHistory.data[0].rowid,
        );

      const { data } = await connection.getTransferHistoryEntries(
        setCrosschainAndTransferHistoryEntryFilters(
          [senderHistory.data[0].rowid],
          senderAccount.id,
          senderHistory.data[0].asset.id,
          senderHistory.data[0].transactionId,
          senderHistory.data[0].opIndex,
        ),
        2,
      );
      expect(JSON.stringify(data)).toStrictEqual(
        JSON.stringify([
          {
            rowid: senderTransferHistoryEntry!.rowid,
            isInput: senderTransferHistoryEntry!.isInput,
            delta: senderTransferHistoryEntry!.delta,
            asset: {
              rowId: asset.rowId,
              id: asset.id,
              name: asset.name,
              symbol: asset.symbol,
              decimals: asset.decimals,
              blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
              iconUrl: asset.iconUrl,
              type: asset.type,
              supply: BigInt(200),
            },
            data: senderTransferHistoryEntry!.data,
            timestamp: senderTransferHistoryEntry!.timestamp,
            transactionId: senderTransferHistoryEntry!.transactionId,
            blockHeight: senderTransferHistoryEntry!.blockHeight,
            operationName: senderTransferHistoryEntry!.operationName,
            opIndex: senderTransferHistoryEntry!.opIndex,
            isCrosschain: senderTransferHistoryEntry!.isCrosschain,
          },
        ]),
      );
    });
  });
});

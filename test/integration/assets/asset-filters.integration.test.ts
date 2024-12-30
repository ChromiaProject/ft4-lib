import { AccountBuilder, getNewAsset, useChromiaNode } from "@ft4-test/util";
import { Asset, getBalanceByAccountId } from "@ft4/asset";
import {
  AssetFilter,
  BalanceFilter,
  CrosschainTransferHistoryEntryFilter,
  TransferHistoryEntryFilter,
} from "@ft4/asset/types";
import { Connection, createConnection } from "@ft4/ft-session";
import { IClient } from "postchain-client";

let client: IClient;
let connection: Connection;

function setAssetFilter(
  rowids: Array<number> = [],
  ids: Array<Buffer>,
  name: string | null = null,
  symbol: string | null = null,
  type: string | null = null,
): AssetFilter {
  return { rowids, ids, name, symbol, type };
}

function setBalanceFilter(
  rowids: Array<number> = [],
  account_id: Buffer | null = null,
  asset_id: Buffer | null = null,
): BalanceFilter {
  return { rowids, accountIds: account_id, assetIds: asset_id };
}

function setCrosschainAndTransferHistoryEntryFilter(
  rowids: Array<number> = [],
  account_id: Buffer | null = null,
  asset_id: Buffer | null = null,
  transaction_rid: Buffer | null = null,
  op_index: number | null = null,
): TransferHistoryEntryFilter | CrosschainTransferHistoryEntryFilter {
  return {
    rowids,
    accountIds: account_id,
    assetIds: asset_id,
    transactionRids: transaction_rid,
    opIndex: op_index,
  };
}

describe("Asset queries using filter", () => {
  const getClient = useChromiaNode();
  const mockBuffer = Buffer.alloc(32);
  const mockString = "mockString";
  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
  });
  describe("getAssets", () => {
    it("returns empty pagination without filter", async () => {
      const { data } = await connection.getAssetsFiltered(null, 1);

      const foundAsset = data.find((item) => item.rowId === 999) ?? null;
      expect(foundAsset).toBe(null);
    });
    it("returns empty pagination with filter", async () => {
      const { data } = await connection.getAssetsFiltered(
        setAssetFilter([0], [mockBuffer], mockString, mockString, mockString),
        1,
      );

      expect(data.length).toBe(0);
    });
    it("returns paginated assets without filter", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_without_filter_0",
        "ASSET_PAGINATED_WITHOUT_FILTER_0",
      );
      const { data } = await connection.getAssetsFiltered(null, 100);
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
    it("returns paginated assets with filter", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_with_filter_1",
        "ASSET_PAGINATED_WITH_FILTER_1",
      );
      const { data } = await connection.getAssetsFiltered(
        setAssetFilter(
          [asset.rowId!],
          [asset.id],
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
    it("returns empty pagination without filter", async () => {
      const { data } = await connection.getBalancesFiltered(null, 1);

      const foundBalance = data.find((item) => item.rowId === 999) ?? null;
      expect(foundBalance).toBe(null);
    });
    it("returns empty pagination with filter", async () => {
      const { data } = await connection.getBalancesFiltered(
        setBalanceFilter([0], mockBuffer, mockBuffer),
        1,
      );

      expect(data.length).toBe(0);
    });
    it("returns paginated balances without filter", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_without_filter_2",
        "ASSET_PAGINATED_WITHOUT_FILTER_2",
      );
      const account = await AccountBuilder.account(connection)
        .withBalance(asset, 200)
        .build();

      const balance = await account.getBalanceByAssetId(asset.id);
      const { data } = await connection.getBalancesFiltered(null, 100);
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
    it("returns paginated balances with filter", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_with_filter_3",
        "ASSET_PAGINATED_WITH_FILTER_3",
      );
      const account = await AccountBuilder.account(connection)
        .withBalance(asset, 200)
        .build();

      const balance = await getBalanceByAccountId(
        connection,
        account.id,
        asset.id,
      );

      const { data } = await connection.getBalancesFiltered(
        setBalanceFilter([balance!.rowId!], account.id, balance!.asset.id),
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
    it("returns empty pagination without filter", async () => {
      const { data } = await connection.getTransferHistoryEntriesFiltered(
        null,
        10,
      );

      const foundTransferHistoryEntry =
        data.find((item) => item.rowid === 999) ?? null;
      expect(foundTransferHistoryEntry).toBe(null);
    });
    it("returns empty pagination with filter", async () => {
      const { data } = await connection.getTransferHistoryEntriesFiltered(
        setCrosschainAndTransferHistoryEntryFilter(
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
    it("returns paginated transfer history entries without filter", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_without_filter_4",
        "ASSET_PAGINATED_WITHOUT_FILTER_4",
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

      const { data } = await connection.getTransferHistoryEntriesFiltered(
        null,
        100,
      );

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
    it("returns paginated transfer history entries with filter", async () => {
      const asset: Asset = await getNewAsset(
        client,
        "asset_paginated_with_filter_5",
        "ASSET_PAGINATED_WITH_FILTER_5",
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

      const { data } = await connection.getTransferHistoryEntriesFiltered(
        setCrosschainAndTransferHistoryEntryFilter(
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

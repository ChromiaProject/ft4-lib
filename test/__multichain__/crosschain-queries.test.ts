import {
  createChromiaClientToMultichain,
  fetchBlockchains,
} from "@ft4-test/util";
import { createConnection } from "@ft4/ft-session";
import {
  cancelCrosschainTransferAndGetCanceledTransfer,
  initCrosschainTransferAndGetPendingTransfer,
  recallCrosschainTransferAndGetRecalledTransfer,
  revertTransferAndGetRevertedTransfer,
  setAssetOriginFilter,
  setPendingTransferFilter,
  setTransferFilter,
  setupApplyCrosschainTransferAndGetAppliedTransfer,
  unapplyCrosschainTransferAndGetUnappliedTransfer,
} from "./crosschain-query-setups";
import { setupTestEnvironment } from "./common-setup";

const mockBuffer: Buffer = Buffer.alloc(32);
describe("crosschain queries by rowid", () => {
  describe("getAssetOriginByRowid", () => {
    it("returns null when asset origin is not found or does not exist", async () => {
      const { multichain00 } = await fetchBlockchains();
      const connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid),
      );

      const fetchedAssetOrigin = await connection00.getAssetOriginByRowid(0);
      expect(fetchedAssetOrigin).toBeNull();
    });

    it("returns null when asset origin exists, but not for the selected rowid", async () => {
      const testContext = await setupTestEnvironment("crosschain-asset-origin");

      const fetchedAssetOrigin =
        await testContext.connection0.getAssetOriginByRowid(999);
      expect(fetchedAssetOrigin).toBeNull();
    });

    it("returns asset origin by rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-asset-origin-1",
      );

      const foundAssetOrigin =
        await testContext.connection0.getAssetOriginFiltered(null, 1);

      const fetchedAssetOrigin =
        await testContext.connection0.getAssetOriginByRowid(
          foundAssetOrigin.data[0].rowId,
        );
      expect(JSON.stringify(fetchedAssetOrigin)).toStrictEqual(
        JSON.stringify({
          rowId: expect.any(Number),
          asset: {
            rowId: testContext.sampleAsset.rowId,
            id: testContext.sampleAsset.id,
            name: testContext.sampleAsset.name,
            symbol: testContext.sampleAsset.symbol,
            decimals: testContext.sampleAsset.decimals,
            blockchainRid: testContext.sampleAsset.blockchainRid,
            iconUrl: testContext.sampleAsset.iconUrl,
            type: testContext.sampleAsset.type,
            supply: testContext.sampleAsset.supply,
          },
          originBlockchainRid: testContext.multichain0.rid,
        }),
      );
    });
  });

  describe("getAppliedTransferByRowid", () => {
    it("returns null when applied transfer is not found or does not exist", async () => {
      const { multichain00 } = await fetchBlockchains();
      const connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid),
      );

      const fetchedAppliedTransfer =
        await connection00.getAppliedTransferByRowid(0);
      expect(fetchedAppliedTransfer).toBeNull();
    });

    it("returns null when applied transfer exists, but not for the selected rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-apply-transfer",
      );

      const foundAppliedTransfer =
        await setupApplyCrosschainTransferAndGetAppliedTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      expect(foundAppliedTransfer).not.toBeNull();

      const fetchedAppliedTransfer =
        await testContext.connection0.getAppliedTransferByRowid(999);
      expect(fetchedAppliedTransfer).toBeNull();
    });

    it("returns applied transfer by rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-apply-transfer-2",
      );

      const foundAppliedTransfer =
        await setupApplyCrosschainTransferAndGetAppliedTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const fetchedAppliedTransfer =
        await testContext.connection0.getAppliedTransferByRowid(
          foundAppliedTransfer.rowId,
        );
      expect(fetchedAppliedTransfer).toEqual({
        rowId: foundAppliedTransfer.rowId,
        initTxRid: foundAppliedTransfer.initTxRid,
        initOpIndex: foundAppliedTransfer.initOpIndex,
        transactionId: foundAppliedTransfer.transactionId,
        opIndex: foundAppliedTransfer.opIndex,
      });
    });
  });

  describe("getCanceledTransferByRowid", () => {
    it("returns null when canceled transfer is not found or does not exist", async () => {
      const { multichain00 } = await fetchBlockchains();
      const connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid),
      );

      const fetchedCanceledTransfer =
        await connection00.getCanceledTransferByRowid(0);
      expect(fetchedCanceledTransfer).toBeNull();
    });

    it("returns null when canceled transfer  exists, but not for the selected rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-cancel-transfer",
      );

      const foundCanceledTransfer =
        await cancelCrosschainTransferAndGetCanceledTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );
      expect(foundCanceledTransfer).not.toBeNull();

      const fetchedCanceledTransfer =
        await testContext.connection0.getCanceledTransferByRowid(999);
      expect(fetchedCanceledTransfer).toBeNull();
    });

    it("returns canceled transfer by rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-cancel-transfer-2",
      );

      const foundCanceledTransfer =
        await cancelCrosschainTransferAndGetCanceledTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const fetchedCanceledTransfer =
        await testContext.connection0.getCanceledTransferByRowid(
          foundCanceledTransfer.rowId,
        );

      expect(fetchedCanceledTransfer).toEqual({
        rowId: foundCanceledTransfer.rowId,
        initTxRid: foundCanceledTransfer.initTxRid,
        initOpIndex: foundCanceledTransfer.initOpIndex,
      });
    });
  });

  describe("getUnappliedTransferByRowid", () => {
    it("returns null when unapplied transfer is not found or does not exist", async () => {
      const { multichain00 } = await fetchBlockchains();
      const connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid),
      );

      const fetchedUnappliedTransfer =
        await connection00.getUnappliedTransferByRowid(0);
      expect(fetchedUnappliedTransfer).toBeNull();
    });

    it("returns null when unapplied transfer exists, but not for the selected rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer",
      );

      const foundUnappliedTransfer =
        await unapplyCrosschainTransferAndGetUnappliedTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      expect(foundUnappliedTransfer).not.toBeNull();

      const fetchedUnappliedTransfer =
        await testContext.connection0.getUnappliedTransferByRowid(999);
      expect(fetchedUnappliedTransfer).toBeNull();
    });

    it("returns unapplied transfer by rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-2",
      );

      const foundUnappliedTransfer =
        await unapplyCrosschainTransferAndGetUnappliedTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const fetchedUnappliedTransfer =
        await testContext.connection0.getUnappliedTransferByRowid(
          foundUnappliedTransfer.rowId,
        );

      expect(fetchedUnappliedTransfer).toEqual({
        rowId: foundUnappliedTransfer.rowId,
        initTxRid: foundUnappliedTransfer.initTxRid,
        initOpIndex: foundUnappliedTransfer.initOpIndex,
      });
    });
  });

  describe("getRecalledTransferByRowid", () => {
    it("returns null when recalled transfer is not found or does not exist", async () => {
      const { multichain00 } = await fetchBlockchains();
      const connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid),
      );

      const fetchedRecalledTransfer =
        await connection00.getRecalledTransferByRowid(0);
      expect(fetchedRecalledTransfer).toBeNull();
    });

    it("returns null when recalled transfer exists, but not for the selected rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer",
      );

      const foundRecalledTransfer =
        await recallCrosschainTransferAndGetRecalledTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );
      expect(foundRecalledTransfer).not.toBeNull();

      const fetchedRecalledTransfer =
        await testContext.connection0.getRecalledTransferByRowid(999);
      expect(fetchedRecalledTransfer).toBeNull();
    });

    it("returns recalled transfer by rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-2",
      );

      const foundRecalledTransfer =
        await recallCrosschainTransferAndGetRecalledTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const fetchedRecalledTransfer =
        await testContext.connection0.getRecalledTransferByRowid(999);

      expect(fetchedRecalledTransfer).toEqual({
        rowId: foundRecalledTransfer.rowId,
        initTxRid: foundRecalledTransfer.initTxRid,
        initOpIndex: foundRecalledTransfer.initOpIndex,
      });
    });
  });

  describe("getPendingTransferByRowid", () => {
    it("returns null when pending transfer is not found or does not exist", async () => {
      const { multichain00 } = await fetchBlockchains();
      const connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid),
      );

      const fetchedPendingTransfer =
        await connection00.getPendingTransferByRowid(0);
      expect(fetchedPendingTransfer).toBeNull();
    });

    it("returns null when pending transfer exists, but not for the selected rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer",
      );

      const foundPendingTransfer =
        await initCrosschainTransferAndGetPendingTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );
      expect(foundPendingTransfer).not.toBeNull();

      const fetchedPendingTransfer =
        await testContext.connection0.getPendingTransferByRowid(999);
      expect(fetchedPendingTransfer).toBeNull();
    });

    it("returns pending transfer by rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-2",
      );

      const foundPendingTransfer =
        await initCrosschainTransferAndGetPendingTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const fetchedPendingTransfer =
        await testContext.connection0.getPendingTransferByRowid(
          foundPendingTransfer.rowId,
        );
      expect(fetchedPendingTransfer).toEqual({
        rowId: foundPendingTransfer.rowId,
        transactionId: foundPendingTransfer.transactionId,
        opIndex: foundPendingTransfer.opIndex,
        senderAccountId: foundPendingTransfer.senderAccountId,
      });
    });
  });

  describe("getRevertedTransferByRowid", () => {
    it("returns null when reverted transfer is not found or does not exist", async () => {
      const { multichain00 } = await fetchBlockchains();
      const connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid),
      );

      const fetchedRevertedTransfer =
        await connection00.getRevertedTransferByRowid(0);
      expect(fetchedRevertedTransfer).toBeNull();
    });

    it("returns null when reverted transfer exists, but not for the selected rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer",
      );

      const foundRevertedTransfer = await revertTransferAndGetRevertedTransfer(
        testContext.connection0,
        testContext.connection1,
        testContext.connection2,
        testContext.sampleAsset,
        testContext.multichain1,
        testContext.session0,
      );

      expect(foundRevertedTransfer).not.toBeNull();

      const fetchedRevertedTransfer =
        await testContext.connection0.getPendingTransferByRowid(999);

      expect(fetchedRevertedTransfer).toBeNull();
    });

    it("returns reverted transfer by rowid", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-2",
      );

      const foundRevertedTransfer = await revertTransferAndGetRevertedTransfer(
        testContext.connection0,
        testContext.connection1,
        testContext.connection2,
        testContext.sampleAsset,
        testContext.multichain1,
        testContext.session0,
      );

      const fetchedRevertedTransfer =
        await testContext.connection0.getPendingTransferByRowid(
          foundRevertedTransfer.rowId,
        );

      expect(fetchedRevertedTransfer).toEqual({
        rowId: foundRevertedTransfer.rowId,
        initTxRid: foundRevertedTransfer.initTxRid,
        initOpIndex: foundRevertedTransfer.initOpIndex,
      });
    });
  });
});

describe("crosschain queries with filter", () => {
  describe("getAssetOriginFiltered", () => {
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-assets-origin-filter-1",
      );
      const { data } = await testContext.connection0.getAssetOriginFiltered(
        null,
        1,
      );
      const foundAssetOrigin = data.find((item) => item.rowId === 999) ?? null;
      expect(foundAssetOrigin).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-assets-origin-filter-2",
      );
      const { data } = await testContext.connection0.getAssetOriginFiltered(
        setAssetOriginFilter([0], mockBuffer),
        1,
      );

      expect(data.length).toBe(0);
    });
    it("returns paginated assets origin without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-assets-origin-filter-3",
      );

      const { data } = await testContext.connection0.getAssetOriginFiltered(
        null,
        1,
      );

      expect(JSON.stringify(data[0])).toStrictEqual(
        JSON.stringify({
          rowId: expect.any(Number),
          asset: {
            rowId: testContext.sampleAsset.rowId,
            id: testContext.sampleAsset.id,
            name: testContext.sampleAsset.name,
            symbol: testContext.sampleAsset.symbol,
            decimals: testContext.sampleAsset.decimals,
            blockchainRid: testContext.sampleAsset.blockchainRid,
            iconUrl: testContext.sampleAsset.iconUrl,
            type: testContext.sampleAsset.type,
            supply: testContext.sampleAsset.supply,
          },
          originBlockchainRid: testContext.multichain0.rid,
        }),
      );
    });
    it("returns paginated assets origin with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-assets-origin-filter-4",
      );

      const { data } = await testContext.connection0.getAssetOriginFiltered(
        setAssetOriginFilter([0], mockBuffer),
        1,
      );

      expect(JSON.stringify(data[0])).toStrictEqual(
        JSON.stringify({
          rowId: expect.any(Number),
          asset: {
            rowId: testContext.sampleAsset.rowId,
            id: testContext.sampleAsset.id,
            name: testContext.sampleAsset.name,
            symbol: testContext.sampleAsset.symbol,
            decimals: testContext.sampleAsset.decimals,
            blockchainRid: testContext.sampleAsset.blockchainRid,
            iconUrl: testContext.sampleAsset.iconUrl,
            type: testContext.sampleAsset.type,
            supply: testContext.sampleAsset.supply,
          },
          originBlockchainRid: testContext.multichain0.rid,
        }),
      );
    });
  });

  describe("getAppliedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-1",
      );
      const promise = testContext.connection0.getAppliedTransfersFiltered(
        setTransferFilter([], mockBuffer),
        1,
      );
      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-2",
      );
      const promise = testContext.connection0.getAppliedTransfersFiltered(
        setTransferFilter([], null, 0),
        1,
      );
      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_tx_rid filter is required",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getAppliedTransfersFiltered(null, 1);
      const foundAppliedTransfer =
        data.find((item) => item.rowId === 999) ?? null;
      expect(foundAppliedTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getAppliedTransfersFiltered(
          setTransferFilter([0], mockBuffer, 0),
          1,
        );

      expect(data.length).toBe(0);
    });
    it("returns paginated applied transfers without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-5",
      );

      const foundAppliedTransfer =
        await setupApplyCrosschainTransferAndGetAppliedTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getAppliedTransfersFiltered(null, 1);

      expect(data[0]).toEqual({
        rowId: foundAppliedTransfer.rowId,
        initTxRid: foundAppliedTransfer.initTxRid,
        initOpIndex: foundAppliedTransfer.initOpIndex,
        transactionId: foundAppliedTransfer.transactionId,
        opIndex: foundAppliedTransfer.opIndex,
      });
    });
    it("returns paginated applied transfers with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-6",
      );

      const foundAppliedTransfer =
        await setupApplyCrosschainTransferAndGetAppliedTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getAppliedTransfersFiltered(
          setTransferFilter(
            [foundAppliedTransfer.rowId],
            foundAppliedTransfer.initTxRid,
            foundAppliedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual({
        rowId: foundAppliedTransfer.rowId,
        initTxRid: foundAppliedTransfer.initTxRid,
        initOpIndex: foundAppliedTransfer.initOpIndex,
        transactionId: foundAppliedTransfer.transactionId,
        opIndex: foundAppliedTransfer.opIndex,
      });
    });
  });

  describe("getCanceledTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-1",
      );

      const promise = testContext.connection0.getCanceledTransfersFiltered(
        setTransferFilter([], mockBuffer),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-2",
      );

      const promise = testContext.connection0.getCanceledTransfersFiltered(
        setTransferFilter([], null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_tx_rid filter is required",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getCanceledTransfersFiltered(null, 1);

      const foundCanceledTransfer =
        data.find((item) => item.rowId === 999) ?? null;
      expect(foundCanceledTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getCanceledTransfersFiltered(
          setTransferFilter([0], mockBuffer, 0),
          1,
        );
      expect(data.length).toBe(0);
    });
    it("returns paginated canceled transfers without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-5",
      );

      const foundCanceledTransfer =
        await cancelCrosschainTransferAndGetCanceledTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getCanceledTransfersFiltered(null, 1);

      expect(data[0]).toEqual({
        rowId: foundCanceledTransfer.rowId,
        initTxRid: foundCanceledTransfer.initTxRid,
        initOpIndex: foundCanceledTransfer.initOpIndex,
      });
    });
    it("returns paginated canceled transfers with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-6",
      );

      const foundCanceledTransfer =
        await cancelCrosschainTransferAndGetCanceledTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getCanceledTransfersFiltered(
          setTransferFilter(
            [foundCanceledTransfer.rowId],
            foundCanceledTransfer.initTxRid,
            foundCanceledTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual({
        rowId: foundCanceledTransfer.rowId,
        initTxRid: foundCanceledTransfer.initTxRid,
        initOpIndex: foundCanceledTransfer.initOpIndex,
      });
    });
  });

  describe("getUnappliedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-1",
      );

      const promise = testContext.connection0.getUnappliedTransfersFiltered(
        setTransferFilter([], mockBuffer),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-2",
      );

      const promise = testContext.connection0.getUnappliedTransfersFiltered(
        setTransferFilter([], null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_tx_rid filter is required",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getUnappliedTransfersFiltered(null, 1);
      const foundUnappliedTransfer =
        data.find((item) => item.rowId === 999) ?? null;
      expect(foundUnappliedTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getUnappliedTransfersFiltered(
          setTransferFilter([0], mockBuffer, 0),
          1,
        );
      expect(data.length).toBe(0);
    });
    it("returns paginated unapplied transfers without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-5",
      );

      const foundUnappliedTransfer =
        await unapplyCrosschainTransferAndGetUnappliedTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getUnappliedTransfersFiltered(null, 1);

      expect(data[0]).toEqual({
        rowId: foundUnappliedTransfer.rowId,
        initTxRid: foundUnappliedTransfer.initTxRid,
        initOpIndex: foundUnappliedTransfer.initOpIndex,
      });
    });
    it("returns paginated unapplied transfers with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-6",
      );

      const foundUnappliedTransfer =
        await unapplyCrosschainTransferAndGetUnappliedTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getUnappliedTransfersFiltered(
          setTransferFilter(
            [foundUnappliedTransfer.rowId],
            foundUnappliedTransfer.initTxRid,
            foundUnappliedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual({
        rowId: foundUnappliedTransfer.rowId,
        initTxRid: foundUnappliedTransfer.initTxRid,
        initOpIndex: foundUnappliedTransfer.initOpIndex,
      });
    });
  });

  describe("getRecalledTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-1",
      );

      const promise = testContext.connection0.getRecalledTransfersFiltered(
        setTransferFilter([], mockBuffer),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-2",
      );

      const promise = testContext.connection0.getRecalledTransfersFiltered(
        setTransferFilter([], null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_tx_rid filter is required",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getRecalledTransfersFiltered(null, 1);
      const foundRecalledTransfer =
        data.find((item) => item.rowId === 999) ?? null;
      expect(foundRecalledTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getRecalledTransfersFiltered(
          setTransferFilter([0], mockBuffer, 0),
          1,
        );

      expect(data.length).toBe(0);
    });
    it("returns paginated recalled transfers without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-5",
      );

      const foundRecalledTransfer =
        await recallCrosschainTransferAndGetRecalledTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getRecalledTransfersFiltered(null, 1);

      expect(data[0]).toEqual({
        rowId: foundRecalledTransfer.rowId,
        initTxRid: foundRecalledTransfer.initTxRid,
        initOpIndex: foundRecalledTransfer.initOpIndex,
      });
    });
    it("returns paginated recalled transfers with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-6",
      );

      const foundRecalledTransfer =
        await recallCrosschainTransferAndGetRecalledTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.connection2,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getRecalledTransfersFiltered(
          setTransferFilter([0], mockBuffer, 0),
          1,
        );

      expect(data[0]).toEqual({
        rowId: foundRecalledTransfer.rowId,
        initTxRid: foundRecalledTransfer.initTxRid,
        initOpIndex: foundRecalledTransfer.initOpIndex,
      });
    });
  });

  describe("getPendingTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index op_index exists but transaction_rid is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-1",
      );

      const promise = testContext.connection0.getPendingTransfersFiltered(
        setPendingTransferFilter([], null, 0, null),
        1,
      );
      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (transaction, op_index) - transaction_rid filter is required",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-2",
      );

      const { data } =
        await testContext.connection0.getPendingTransfersFiltered(null, 1);

      const foundPendingTransfer =
        data.find((item) => item.rowId === 999) ?? null;
      expect(foundPendingTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getPendingTransfersFiltered(
          setPendingTransferFilter([0], mockBuffer, 0, mockBuffer),
          1,
        );

      expect(data.length).toBe(0);
    });
    it("returns paginated pending transfers without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-4",
      );

      const foundPendingTransfer =
        await initCrosschainTransferAndGetPendingTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getPendingTransfersFiltered(null, 1);

      expect(data[0]).toEqual({
        rowId: foundPendingTransfer.rowId,
        transactionId: foundPendingTransfer.transactionId,
        opIndex: foundPendingTransfer.opIndex,
        senderAccountId: foundPendingTransfer.senderAccountId,
      });
    });
    it("returns paginated pending transfers with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-5",
      );

      const foundPendingTransfer =
        await initCrosschainTransferAndGetPendingTransfer(
          testContext.connection0,
          testContext.connection1,
          testContext.sampleAsset,
          testContext.multichain1,
          testContext.session0,
        );

      const { data } =
        await testContext.connection0.getPendingTransfersFiltered(
          setPendingTransferFilter(
            [foundPendingTransfer.rowId],
            foundPendingTransfer.transactionId,
            foundPendingTransfer.opIndex,
            foundPendingTransfer.senderAccountId,
          ),
          1,
        );

      expect(data[0]).toEqual({
        rowId: foundPendingTransfer.rowId,
        transactionId: foundPendingTransfer.transactionId,
        opIndex: foundPendingTransfer.opIndex,
        senderAccountId: foundPendingTransfer.senderAccountId,
      });
    });
  });

  describe("getRevertedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-1",
      );

      const promise = testContext.connection0.getRevertedTransfersFiltered(
        setTransferFilter([], mockBuffer),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-2",
      );

      const promise = testContext.connection0.getRevertedTransfersFiltered(
        setTransferFilter([], null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rid, init_op_index) - init_tx_rid filter is required",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getRevertedTransfersFiltered(null, 1);

      const foundRevertedTransfer =
        data.find((item) => item.rowId === 999) ?? null;
      expect(foundRevertedTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getRevertedTransfersFiltered(
          setTransferFilter([0], mockBuffer, 0),
          1,
        );

      expect(data.length).toBe(0);
    });
    it("returns paginated reverted transfers without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-5",
      );

      const foundRevertedTransfer = await revertTransferAndGetRevertedTransfer(
        testContext.connection0,
        testContext.connection1,
        testContext.connection2,
        testContext.sampleAsset,
        testContext.multichain1,
        testContext.session0,
      );

      const { data } =
        await testContext.connection0.getRevertedTransfersFiltered(null, 1);

      expect(data[0]).toEqual({
        rowId: foundRevertedTransfer.rowId,
        initTxRid: foundRevertedTransfer.initTxRid,
        initOpIndex: foundRevertedTransfer.initOpIndex,
      });
    });
    it("returns paginated reverted transfers with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-6",
      );

      const foundRevertedTransfer = await revertTransferAndGetRevertedTransfer(
        testContext.connection0,
        testContext.connection1,
        testContext.connection2,
        testContext.sampleAsset,
        testContext.multichain1,
        testContext.session0,
      );

      const { data } =
        await testContext.connection0.getRevertedTransfersFiltered(
          setTransferFilter(
            [foundRevertedTransfer.rowId],
            foundRevertedTransfer.initTxRid,
            foundRevertedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual({
        rowId: foundRevertedTransfer.rowId,
        initTxRid: foundRevertedTransfer.initTxRid,
        initOpIndex: foundRevertedTransfer.initOpIndex,
      });
    });
  });
});

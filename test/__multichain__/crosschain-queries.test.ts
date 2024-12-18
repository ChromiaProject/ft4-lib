import {
  createChromiaClientToMultichain,
  fetchBlockchains,
} from "@ft4-test/util";
import { createConnection } from "@ft4/ft-session";
import {
  cancelCrosschainTransferAndGetCanceledTransfer,
  initCrosschainTransferAndGetPendingTransfer,
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

    it("returns null when asset origin exists but not for the selected rowid", async () => {
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
        await testContext.connection2.getAssetOriginFiltered(null, 1);

      const fetchedAssetOrigin =
        await testContext.connection2.getAssetOriginByRowid(
          foundAssetOrigin.data[0].rowId,
        );

      expect(JSON.stringify(fetchedAssetOrigin)).toStrictEqual(
        JSON.stringify({
          rowId: foundAssetOrigin.data[0].rowId,
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

    it("returns null when applied transfer exists but not for the selected rowid", async () => {
      const { testContext } =
        await setupApplyCrosschainTransferAndGetAppliedTransfer(
          "crosschain-apply-transfer",
        );

      const fetchedAppliedTransfer =
        await testContext.connection0.getAppliedTransferByRowid(999);
      expect(fetchedAppliedTransfer).toBeNull();
    });

    it("returns applied transfer by rowid", async () => {
      const { testContext, appliedTransfer } =
        await setupApplyCrosschainTransferAndGetAppliedTransfer(
          "crosschain-apply-transfer-2",
        );

      const fetchedAppliedTransfer =
        await testContext.connection2.getAppliedTransferByRowid(
          appliedTransfer.rowId,
        );
      expect(fetchedAppliedTransfer).toEqual(appliedTransfer);
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

    it("returns null when canceled transfer exists but not for the selected rowid", async () => {
      const { testContext } =
        await cancelCrosschainTransferAndGetCanceledTransfer(
          "crosschain-cancel-transfer",
        );

      const fetchedCanceledTransfer =
        await testContext.connection0.getCanceledTransferByRowid(999);
      expect(fetchedCanceledTransfer).toBeNull();
    });

    it("returns canceled transfer by rowid", async () => {
      const { testContext, canceledTransfer } =
        await cancelCrosschainTransferAndGetCanceledTransfer(
          "crosschain-cancel-transfer-2",
        );

      const fetchedCanceledTransfer =
        await testContext.connection2.getCanceledTransferByRowid(
          canceledTransfer.rowId,
        );

      expect(fetchedCanceledTransfer).toEqual(canceledTransfer);
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

    it("returns null when unapplied transfer exists but not for the selected rowid", async () => {
      const { testContext } =
        await unapplyCrosschainTransferAndGetUnappliedTransfer(
          "crosschain-unapplied-transfer",
        );

      const fetchedUnappliedTransfer =
        await testContext.connection0.getUnappliedTransferByRowid(999);
      expect(fetchedUnappliedTransfer).toBeNull();
    });

    it("returns unapplied transfer by rowid", async () => {
      const { testContext, unappliedTransfer } =
        await unapplyCrosschainTransferAndGetUnappliedTransfer(
          "crosschain-unapplied-transfer-2",
        );

      const fetchedUnappliedTransfer =
        await testContext.connection2.getUnappliedTransferByRowid(
          unappliedTransfer.rowId,
        );

      expect(fetchedUnappliedTransfer).toEqual(unappliedTransfer);
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

    it("returns null when pending transfer exists but not for the selected rowid", async () => {
      const { testContext } = await initCrosschainTransferAndGetPendingTransfer(
        "crosschain-pending-transfer",
      );
      const fetchedPendingTransfer =
        await testContext.connection0.getPendingTransferByRowid(999);
      expect(fetchedPendingTransfer).toBeNull();
    });

    it("returns pending transfer by rowid", async () => {
      const { testContext, pendingTransfer } =
        await initCrosschainTransferAndGetPendingTransfer(
          "crosschain-pending-transfer-2",
        );

      const fetchedPendingTransfer =
        await testContext.connection0.getPendingTransferByRowid(
          pendingTransfer.rowId,
        );
      expect(fetchedPendingTransfer).toEqual(pendingTransfer);
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

    it("returns null when reverted transfer exists but not for the selected rowid", async () => {
      const { testContext } = await revertTransferAndGetRevertedTransfer(
        "crosschain-reverted-transfer",
      );

      const fetchedRevertedTransfer =
        await testContext.connection0.getRevertedTransferByRowid(999);

      expect(fetchedRevertedTransfer).toBeNull();
    });

    it("returns reverted transfer by rowid", async () => {
      const { testContext, revertedTransfer } =
        await revertTransferAndGetRevertedTransfer(
          "crosschain-reverted-transfer-2",
        );

      const fetchedRevertedTransfer =
        await testContext.connection0.getRevertedTransferByRowid(
          revertedTransfer.rowId,
        );

      expect(fetchedRevertedTransfer).toEqual(revertedTransfer);
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

      const { data } = await testContext.connection2.getAssetOriginFiltered(
        null,
        1,
      );

      expect(data[0].rowId).toEqual(expect.any(Number));
      expect(data[0].originBlockchainRid).toEqual(testContext.multichain0.rid);
      expect(JSON.stringify(data[0].asset)).toStrictEqual(
        JSON.stringify({
          rowId: testContext.sampleAsset.rowId,
          id: testContext.sampleAsset.id,
          name: testContext.sampleAsset.name,
          symbol: testContext.sampleAsset.symbol,
          decimals: testContext.sampleAsset.decimals,
          blockchainRid: testContext.sampleAsset.blockchainRid,
          iconUrl: testContext.sampleAsset.iconUrl,
          type: testContext.sampleAsset.type,
          supply: testContext.sampleAsset.supply,
        }),
      );
    });
    it("returns paginated assets origin with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-assets-origin-filter-4",
      );

      const assetOriginWithoutFilter =
        await testContext.connection2.getAssetOriginFiltered(null, 1);

      const { data } = await testContext.connection2.getAssetOriginFiltered(
        setAssetOriginFilter(
          [assetOriginWithoutFilter.data[0].rowId],
          testContext.sampleAsset.id,
        ),
        1,
      );

      expect(data[0].rowId).toEqual(expect.any(Number));
      expect(data[0].originBlockchainRid).toEqual(testContext.multichain0.rid);
      expect(JSON.stringify(data[0].asset)).toStrictEqual(
        JSON.stringify({
          rowId: testContext.sampleAsset.rowId,
          id: testContext.sampleAsset.id,
          name: testContext.sampleAsset.name,
          symbol: testContext.sampleAsset.symbol,
          decimals: testContext.sampleAsset.decimals,
          blockchainRid: testContext.sampleAsset.blockchainRid,
          iconUrl: testContext.sampleAsset.iconUrl,
          type: testContext.sampleAsset.type,
          supply: testContext.sampleAsset.supply,
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
      const { appliedTransfer, appliedTransfersFiltered } =
        await setupApplyCrosschainTransferAndGetAppliedTransfer(
          "crosschain-applied-transfer-filter-5",
        );

      expect(appliedTransfersFiltered.data[0]).toEqual(appliedTransfer);
    });
    it("returns paginated applied transfers with all filter", async () => {
      const { testContext, appliedTransfer } =
        await setupApplyCrosschainTransferAndGetAppliedTransfer(
          "crosschain-applied-transfer-filter-6",
        );

      const { data } =
        await testContext.connection2.getAppliedTransfersFiltered(
          setTransferFilter(
            [appliedTransfer.rowId],
            appliedTransfer.initTxRid,
            appliedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(appliedTransfer);
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
      const { testContext, canceledTransfer } =
        await cancelCrosschainTransferAndGetCanceledTransfer(
          "crosschain-canceled-transfer-filter-5",
        );

      const { data } =
        await testContext.connection2.getCanceledTransfersFiltered(null, 1);

      expect(data[0]).toEqual(canceledTransfer);
    });
    it("returns paginated canceled transfers with all filter", async () => {
      const { testContext, canceledTransfer } =
        await cancelCrosschainTransferAndGetCanceledTransfer(
          "crosschain-canceled-transfer-filter-6",
        );

      const { data } =
        await testContext.connection2.getCanceledTransfersFiltered(
          setTransferFilter(
            [canceledTransfer.rowId],
            canceledTransfer.initTxRid,
            canceledTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(canceledTransfer);
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
      const { unappliedTransfer, unappliedTransfersFiltered } =
        await unapplyCrosschainTransferAndGetUnappliedTransfer(
          "crosschain-unapplied-transfer-filter-5",
        );

      expect(unappliedTransfersFiltered.data[0]).toEqual(unappliedTransfer);
    });
    it("returns paginated unapplied transfers with all filter", async () => {
      const { testContext, unappliedTransfer } =
        await unapplyCrosschainTransferAndGetUnappliedTransfer(
          "crosschain-unapplied-transfer-filter-6",
        );

      const { data } =
        await testContext.connection2.getUnappliedTransfersFiltered(
          setTransferFilter(
            [unappliedTransfer.rowId],
            unappliedTransfer.initTxRid,
            unappliedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(unappliedTransfer);
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
      const { pendingTransfer, pendingTransfersFiltered } =
        await initCrosschainTransferAndGetPendingTransfer(
          "crosschain-pending-transfer-filter-4",
        );

      expect(pendingTransfersFiltered.data[0]).toEqual(pendingTransfer);
    });
    it("returns paginated pending transfers with all filter", async () => {
      const { testContext, pendingTransfer } =
        await initCrosschainTransferAndGetPendingTransfer(
          "crosschain-pending-transfer-filter-5",
        );

      const { data } =
        await testContext.connection0.getPendingTransfersFiltered(
          setPendingTransferFilter(
            [pendingTransfer.rowId],
            pendingTransfer.transactionId,
            pendingTransfer.opIndex,
            pendingTransfer.senderAccountId,
          ),
          1,
        );

      expect(data[0]).toEqual(pendingTransfer);
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
      const { testContext, revertedTransfer } =
        await revertTransferAndGetRevertedTransfer(
          "crosschain-reverted-transfer-filter-5",
        );

      const { data } =
        await testContext.connection0.getRevertedTransfersFiltered(null, 1);

      expect(data[0]).toEqual(revertedTransfer);
    });
    it("returns paginated reverted transfers with all filter", async () => {
      const { testContext, revertedTransfer } =
        await revertTransferAndGetRevertedTransfer(
          "crosschain-reverted-transfer-filter-6",
        );

      const { data } =
        await testContext.connection0.getRevertedTransfersFiltered(
          setTransferFilter(
            [revertedTransfer.rowId],
            revertedTransfer.initTxRid,
            revertedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(revertedTransfer);
    });
  });
});

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
import { getAssetOriginById } from "@ft4/crosschain";
import { gtxToRawGtx } from "@ft4/crosschain/utils";
import { getTransactionRid } from "@ft4/utils";

const mockBuffer: Buffer = Buffer.alloc(32);

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
      const foundAssetOrigin =
        data.find(
          (item) =>
            item.asset.id.toString("hex") === mockBuffer.toString("hex"),
        ) ?? null;
      expect(foundAssetOrigin).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-assets-origin-filter-2",
      );
      const { data } = await testContext.connection0.getAssetOriginFiltered(
        setAssetOriginFilter([mockBuffer]),
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
        100,
      );

      const foundAssetOrigin = data.find(
        (item) =>
          item.asset.id.toString("hex") ===
          testContext.sampleAsset.id.toString("hex"),
      );

      expect(foundAssetOrigin!.originBlockchainRid).toEqual(
        testContext.multichain0.rid,
      );
      expect(JSON.stringify(foundAssetOrigin!.asset)).toStrictEqual(
        JSON.stringify({
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

      const { data } = await testContext.connection2.getAssetOriginFiltered(
        setAssetOriginFilter([testContext.sampleAsset.id]),
        100,
      );

      const assetOriginBlockchainRid = await getAssetOriginById(
        testContext.connection2,
        testContext.sampleAsset.id,
      );

      const foundAssetOrigin = data.find(
        (item) =>
          item.asset.id.toString("hex") ===
          testContext.sampleAsset.id.toString("hex"),
      );

      expect(JSON.stringify(foundAssetOrigin)).toStrictEqual(
        JSON.stringify({
          asset: {
            id: testContext.sampleAsset.id,
            name: testContext.sampleAsset.name,
            symbol: testContext.sampleAsset.symbol,
            decimals: testContext.sampleAsset.decimals,
            blockchainRid: testContext.sampleAsset.blockchainRid,
            iconUrl: testContext.sampleAsset.iconUrl,
            type: testContext.sampleAsset.type,
            supply: testContext.sampleAsset.supply,
          },
          originBlockchainRid: assetOriginBlockchainRid,
        }),
      );
    });
  });

  describe("getAppliedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rids exist but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-1",
      );
      const promise = testContext.connection0.getAppliedTransfersFiltered(
        setTransferFilter([mockBuffer]),
        1,
      );
      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rids array is empty", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-2",
      );
      const promise = testContext.connection0.getAppliedTransfersFiltered(
        setTransferFilter(null, 0),
        1,
      );
      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_tx_rids filter cannot be empty",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getAppliedTransfersFiltered(null, 1);
      const foundAppliedTransfer =
        data.find(
          (item) =>
            item.transactionId.toString("hex") === mockBuffer.toString("hex"),
        ) ?? null;
      expect(foundAppliedTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-applied-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getAppliedTransfersFiltered(
          setTransferFilter([mockBuffer], 0),
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
            [appliedTransfer.initTxRid],
            appliedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(appliedTransfer);
    });
  });

  describe("getCanceledTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rids exist but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-1",
      );

      const promise = testContext.connection0.getCanceledTransfersFiltered(
        setTransferFilter([mockBuffer]),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rids array is empty", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-2",
      );

      const promise = testContext.connection0.getCanceledTransfersFiltered(
        setTransferFilter(null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_tx_rids filter cannot be empty",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getCanceledTransfersFiltered(null, 1);

      const foundCanceledTransfer =
        data.find(
          (item) =>
            item.initTxRid.toString("hex") === mockBuffer.toString("hex"),
        ) ?? null;
      expect(foundCanceledTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-canceled-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getCanceledTransfersFiltered(
          setTransferFilter([mockBuffer], 0),
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
            [canceledTransfer.initTxRid],
            canceledTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(canceledTransfer);
    });
  });

  describe("getUnappliedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rids exist but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-1",
      );

      const promise = testContext.connection0.getUnappliedTransfersFiltered(
        setTransferFilter([mockBuffer]),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rids array is empty", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-2",
      );

      const promise = testContext.connection0.getUnappliedTransfersFiltered(
        setTransferFilter(null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_tx_rids filter cannot be empty",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getUnappliedTransfersFiltered(null, 1);
      const foundUnappliedTransfer =
        data.find(
          (item) =>
            item.initTxRid.toString("hex") === mockBuffer.toString("hex"),
        ) ?? null;
      expect(foundUnappliedTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-unapplied-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getUnappliedTransfersFiltered(
          setTransferFilter([mockBuffer], 0),
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
            [unappliedTransfer.initTxRid],
            unappliedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(unappliedTransfer);
    });
  });

  describe("getPendingTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index op_index exists but transaction_rids array is empty", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-1",
      );

      const promise = testContext.connection0.getPendingTransfersFiltered(
        setPendingTransferFilter(null, 0, null),
        1,
      );
      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (transaction_rids, op_index) - transaction_rids filter cannot be empty",
      );
    });
    it("throws `INVALID FILTER` error when composite index transaction_rids exist but op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-2",
      );

      const promise = testContext.connection0.getPendingTransfersFiltered(
        setPendingTransferFilter([mockBuffer], null, null),
        1,
      );
      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (transaction_rids, op_index) - op_index filter is required",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getPendingTransfersFiltered(null, 1);

      const foundPendingTransfer =
        data.find(
          (item) =>
            item.senderAccount.id.toString("hex") ===
            mockBuffer.toString("hex"),
        ) ?? null;
      expect(foundPendingTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-pending-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getPendingTransfersFiltered(
          setPendingTransferFilter([mockBuffer], 0, mockBuffer),
          1,
        );

      expect(data.length).toBe(0);
    });
    it("returns paginated pending transfers without filter", async () => {
      const { pendingTransfer, pendingTransfersFiltered } =
        await initCrosschainTransferAndGetPendingTransfer(
          "crosschain-pending-transfer-filter-5",
        );

      expect(pendingTransfersFiltered.data[0]).toEqual(pendingTransfer);
    });
    it("returns paginated pending transfers with all filter", async () => {
      const { testContext, pendingTransfer } =
        await initCrosschainTransferAndGetPendingTransfer(
          "crosschain-pending-transfer-filter-6",
        );

      const rawTx = gtxToRawGtx(pendingTransfer.tx);
      const pendingTransferTxRid = getTransactionRid(rawTx);

      const { data } =
        await testContext.connection0.getPendingTransfersFiltered(
          setPendingTransferFilter(
            [pendingTransferTxRid],
            pendingTransfer.opIndex,
            pendingTransfer.senderAccount.id,
          ),
          1,
        );

      expect(data[0]).toEqual(pendingTransfer);
    });
  });

  describe("getRevertedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rids exist but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-1",
      );

      const promise = testContext.connection0.getRevertedTransfersFiltered(
        setTransferFilter([mockBuffer]),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rids array is empty", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-2",
      );

      const promise = testContext.connection0.getRevertedTransfersFiltered(
        setTransferFilter(null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_tx_rids filter cannot be empty",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getRevertedTransfersFiltered(null, 1);

      const foundRevertedTransfer =
        data.find(
          (item) =>
            item.initTxRid.toString("hex") === mockBuffer.toString("hex"),
        ) ?? null;
      expect(foundRevertedTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-reverted-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getRevertedTransfersFiltered(
          setTransferFilter([mockBuffer], 0),
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
            [revertedTransfer.initTxRid],
            revertedTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(revertedTransfer);
    });
  });

  describe("getRecalledTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rids exist but init_op_index is not", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-1",
      );

      const promise = testContext.connection0.getRecalledTransfersFiltered(
        setTransferFilter([mockBuffer]),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_op_index filter is required",
      );
    });
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rids array is empty", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-2",
      );

      const promise = testContext.connection0.getRecalledTransfersFiltered(
        setTransferFilter(null, 0),
        1,
      );

      await expect(promise).rejects.toThrow(
        "INVALID FILTER: Composite index (init_tx_rids, init_op_index) - init_tx_rids filter cannot be empty",
      );
    });
    it("returns empty pagination without filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-3",
      );

      const { data } =
        await testContext.connection0.getRecalledTransfersFiltered(null, 1);
      const foundRecalledTransfer =
        data.find(
          (item) =>
            item.initTxRid.toString("hex") === mockBuffer.toString("hex"),
        ) ?? null;
      expect(foundRecalledTransfer).toBe(null);
    });
    it("returns empty pagination with all filter", async () => {
      const testContext = await setupTestEnvironment(
        "crosschain-recalled-transfer-filter-4",
      );

      const { data } =
        await testContext.connection0.getRecalledTransfersFiltered(
          setTransferFilter([mockBuffer], 0),
          1,
        );

      expect(data.length).toBe(0);
    });
    it("returns paginated recalled transfers without filter", async () => {
      const { testContext, recalledTransfer } =
        await recallCrosschainTransferAndGetRecalledTransfer(
          "crosschain-recalled-transfer-filter-5",
        );

      const { data } =
        await testContext.connection1.getRecalledTransfersFiltered(null, 1);

      expect(data[0]).toEqual(recalledTransfer);
    });
    it("returns paginated recalled transfers with all filter", async () => {
      const { testContext, recalledTransfer } =
        await recallCrosschainTransferAndGetRecalledTransfer(
          "crosschain-recalled-transfer-filter-6",
        );

      const { data } =
        await testContext.connection1.getRecalledTransfersFiltered(
          setTransferFilter(
            [recalledTransfer.initTxRid],
            recalledTransfer.initOpIndex,
          ),
          1,
        );

      expect(data[0]).toEqual(recalledTransfer);
    });
  });
});

import {
  createChromiaClientToMultichain,
  fetchBlockchains,
} from "@ft4-test/util";
import { createConnection } from "@ft4/ft-session";

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

    it("returns null when asset origin is not for rowid", async () => {});

    it("returns asset origin by rowid", async () => {});
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

    it("returns null when applied transfer is not for rowid", async () => {});

    it("returns applied transfer by rowid", async () => {});
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

    it("returns null when canceled transfer is not for rowid", async () => {});

    it("returns canceled transfer by rowid", async () => {});
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

    it("returns null when unapplied transfer is not for rowid", async () => {});

    it("returns unapplied transfer by rowid", async () => {});
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

    it("returns null when recalled transfer is not for rowid", async () => {});

    it("returns recalled transfer by rowid", async () => {});
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

    it("returns null when pending transfer is not for rowid", async () => {});

    it("returns pending transfer by rowid", async () => {});
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

    it("returns null when reverted transfer is not for rowid", async () => {});

    it("returns reverted transfer by rowid", async () => {});
  });
});

describe("crosschain queries with filter", () => {
  describe("getAssetOriginFiltered", () => {
    it("returns empty pagination without filter", () => {});
    it("returns empty pagination with all filter", () => {});
    it("returns paginated assets origin without filter", () => {});
    it("returns paginated assets origin with all filter", () => {});
  });

  describe("getAppliedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", () => {});
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", () => {});
    it("returns empty pagination without filter", () => {});
    it("returns empty pagination with all filter", () => {});
    it("returns paginated applied transfers without filter", () => {});
    it("returns paginated applied transfers with all filter", () => {});
  });

  describe("getCanceledTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", () => {});
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", () => {});
    it("returns empty pagination without filter", () => {});
    it("returns empty pagination with all filter", () => {});
    it("returns paginated canceled transfers without filter", () => {});
    it("returns paginated canceled transfers with all filter", () => {});
  });

  describe("getUnappliedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", () => {});
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", () => {});
    it("returns empty pagination without filter", () => {});
    it("returns empty pagination with all filter", () => {});
    it("returns paginated unapplied transfers without filter", () => {});
    it("returns paginated unapplied transfers with all filter", () => {});
  });

  describe("getRecalledTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", () => {});
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", () => {});
    it("returns empty pagination without filter", () => {});
    it("returns empty pagination with all filter", () => {});
    it("returns paginated recalled transfers without filter", () => {});
    it("returns paginated recalled transfers with all filter", () => {});
  });

  describe("getPendingTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index op_index exists but transaction_rid is not", () => {});
    it("returns empty pagination without filter", () => {});
    it("returns empty pagination with all filter", () => {});
    it("returns paginated pending transfers without filter", () => {});
    it("returns paginated pending transfers with all filter", () => {});
  });

  describe("getRevertedTransfersFiltered", () => {
    it("throws `INVALID FILTER` error when composite index init_tx_rid exists but init_op_index is not", () => {});
    it("throws `INVALID FILTER` error when composite index init_op_index exists but init_tx_rid is not", () => {});
    it("returns empty pagination without filter", () => {});
    it("returns empty pagination with all filter", () => {});
    it("returns paginated reverted transfers without filter", () => {});
    it("returns paginated reverted transfers with all filter", () => {});
  });
});

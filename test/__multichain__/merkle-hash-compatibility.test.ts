import {
  Blockchain,
  createChromiaClientToMultichain,
  fetchBlockchains,
  NODE_URL,
} from "@ft4-test/util";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  initAndApplyCrosschainTransfer,
  initAndCancelCrosschainTransfer,
  initApplyCancelUnapplyCrosschainTransfer,
  setupTestWithCrosschainTransfer,
} from "./crosschain-helpers";

let multichain00: Blockchain;
let multichain01: Blockchain;
let multichain03: Blockchain;
let multichain04: Blockchain;

describe("crosschain transfer compatibility", () => {
  beforeAll(async () => {
    const blockchains = await fetchBlockchains(false);
    multichain00 = blockchains.multichain00;
    multichain01 = blockchains.multichain01;
    multichain03 = blockchains.multichain03;
    multichain04 = blockchains.multichain04;
  });

  describe("merkleHash version 1 -> 2 -> 1", () => {
    let connection00: Connection;
    let connection03: Connection;
    let connection01: Connection;
    let path: Connection[];
    beforeAll(async () => {
      connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid, NODE_URL),
      );

      connection03 = createConnection(
        await createChromiaClientToMultichain(multichain03.rid, NODE_URL),
      );

      connection01 = createConnection(
        await createChromiaClientToMultichain(multichain01.rid, NODE_URL),
      );
      path = [connection00, connection03, connection01];
    });

    describe("accounts are registered before transfer", () => {
      it("inits and applies transfer", async () => {
        const { senderAccount, recipientAccount, asset } =
          await setupTestWithCrosschainTransfer(
            path,
            "crosschain-transfer-test-asset-compatibility01",
            true,
          );

        await initAndApplyCrosschainTransfer(
          recipientAccount.id,
          asset,
          multichain01.rid,
          senderAccount,
        );
      });

      it("inits and cancels expired transfer", async () => {
        const { senderAccount, recipientAccount, asset } =
          await setupTestWithCrosschainTransfer(
            path,
            "crosschain-transfer-test-asset-compatibility02",
            true,
          );

        await initAndCancelCrosschainTransfer(
          recipientAccount.id,
          asset,
          multichain01.rid,
          senderAccount,
        );
      });

      it("inits applies cancels and unapplies a transfer", async () => {
        const { senderAccount, recipientAccount, asset } =
          await setupTestWithCrosschainTransfer(
            path,
            "crosschain-transfer-test-asset-compatibility03",
            true,
          );

        await initApplyCancelUnapplyCrosschainTransfer(
          recipientAccount.id,
          asset,
          multichain01.rid,
          senderAccount,
        );
      });
    });

    describe("accounts are registered using transfer open once assets are send to the account", () => {
      it("inits and applies transfer", async () => {
        const { senderAccount, asset } = await setupTestWithCrosschainTransfer(
          path,
          "crosschain-transfer-test-asset-compatibility04",
          false,
        );

        await initAndApplyCrosschainTransfer(
          senderAccount.id,
          asset,
          multichain01.rid,
          senderAccount,
        );
      });

      it("inits and cancels expired transfer", async () => {
        const { senderAccount, asset } = await setupTestWithCrosschainTransfer(
          path,
          "crosschain-transfer-test-asset-compatibility05",
          false,
        );

        await initAndCancelCrosschainTransfer(
          senderAccount.id,
          asset,
          multichain01.rid,
          senderAccount,
        );
      });

      it("inits applies cancels and unapplies a transfer", async () => {
        const { senderAccount, asset } = await setupTestWithCrosschainTransfer(
          path,
          "crosschain-transfer-test-asset-compatibility06",
          false,
        );

        await initApplyCancelUnapplyCrosschainTransfer(
          senderAccount.id,
          asset,
          multichain01.rid,
          senderAccount,
        );
      });
    });
  });

  describe("merkleHash version 2 -> 1 -> 2", () => {
    let connection03: Connection;
    let connection00: Connection;
    let connection04: Connection;
    let path: Connection[];
    beforeAll(async () => {
      connection03 = createConnection(
        await createChromiaClientToMultichain(multichain03.rid, NODE_URL),
      );

      connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid, NODE_URL),
      );

      connection04 = createConnection(
        await createChromiaClientToMultichain(multichain04.rid, NODE_URL),
      );
      path = [connection03, connection00, connection04];
    });
    describe("accounts are registered before transfer", () => {
      it("inits and applies transfer", async () => {
        const { senderAccount, recipientAccount, asset } =
          await setupTestWithCrosschainTransfer(
            path,
            "crosschain-transfer-test-asset-compatibility07",
            true,
          );

        await initAndApplyCrosschainTransfer(
          recipientAccount.id,
          asset,
          multichain04.rid,
          senderAccount,
        );
      });

      it("inits and cancels expired transfer", async () => {
        const { senderAccount, recipientAccount, asset } =
          await setupTestWithCrosschainTransfer(
            path,
            "crosschain-transfer-test-asset-compatibility08",
            true,
          );

        await initAndCancelCrosschainTransfer(
          recipientAccount.id,
          asset,
          multichain04.rid,
          senderAccount,
        );
      });

      it("inits applies cancels and unapplies a transfer", async () => {
        const { senderAccount, recipientAccount, asset } =
          await setupTestWithCrosschainTransfer(
            path,
            "crosschain-transfer-test-asset-compatibility09",
            true,
          );

        await initApplyCancelUnapplyCrosschainTransfer(
          recipientAccount.id,
          asset,
          multichain04.rid,
          senderAccount,
        );
      });
    });

    describe("accounts are registered using transfer open once assets are send to the account", () => {
      it("inits and applies transfer", async () => {
        const { senderAccount, asset } = await setupTestWithCrosschainTransfer(
          path,
          "crosschain-transfer-test-asset-compatibility10",
          false,
        );

        await initAndApplyCrosschainTransfer(
          senderAccount.id,
          asset,
          multichain04.rid,
          senderAccount,
        );
      });

      it("inits and cancels expired transfer", async () => {
        const { senderAccount, asset } = await setupTestWithCrosschainTransfer(
          path,
          "crosschain-transfer-test-asset-compatibility11",
          false,
        );

        await initAndCancelCrosschainTransfer(
          senderAccount.id,
          asset,
          multichain04.rid,
          senderAccount,
        );
      });

      it("inits applies cancels and unapplies a transfer", async () => {
        const { senderAccount, asset } = await setupTestWithCrosschainTransfer(
          path,
          "crosschain-transfer-test-asset-compatibility12",
          false,
        );
        await initApplyCancelUnapplyCrosschainTransfer(
          senderAccount.id,
          asset,
          multichain04.rid,
          senderAccount,
        );
      });
    });
  });

  describe("completes successful crosschain transfers between chains with the same merkleHashVersion", () => {
    let connection00: Connection;
    let connection01: Connection;
    let connection03: Connection;
    let connection04: Connection;

    beforeAll(async () => {
      connection00 = createConnection(
        await createChromiaClientToMultichain(multichain00.rid, NODE_URL),
      );

      connection01 = createConnection(
        await createChromiaClientToMultichain(multichain01.rid, NODE_URL),
      );

      connection03 = createConnection(
        await createChromiaClientToMultichain(multichain03.rid, NODE_URL),
      );

      connection04 = createConnection(
        await createChromiaClientToMultichain(multichain04.rid, NODE_URL),
      );
    });

    it("merkleHash version 1 -> 1", async () => {
      const { senderAccount, recipientAccount, asset } =
        await setupTestWithCrosschainTransfer(
          [connection00, connection01],
          "crosschain-transfer-test-asset-compatibility13",
          true,
        );

      let balanceOnChain00 = (
        await senderAccount.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      let balanceOnChain01 = (
        await recipientAccount.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      expect(balanceOnChain00).toEqual("100");
      expect(balanceOnChain01).toBe(undefined);

      await initAndApplyCrosschainTransfer(
        recipientAccount.id,
        asset,
        multichain01.rid,
        senderAccount,
      );

      balanceOnChain00 = (
        await senderAccount.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      balanceOnChain01 = (
        await recipientAccount.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      expect(balanceOnChain00).toBe(undefined);
      expect(balanceOnChain01).toEqual("100");
    });

    it("merkleHash version 2 -> 2", async () => {
      const { senderAccount, recipientAccount, asset } =
        await setupTestWithCrosschainTransfer(
          [connection03, connection04],
          "crosschain-transfer-test-asset-compatibility14",
          true,
        );

      let balanceOnChain03 = (
        await senderAccount.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      let balanceOnChain04 = (
        await recipientAccount.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      expect(balanceOnChain03).toEqual("100");
      expect(balanceOnChain04).toBe(undefined);

      await initAndApplyCrosschainTransfer(
        recipientAccount.id,
        asset,
        multichain04.rid,
        senderAccount,
      );

      balanceOnChain03 = (
        await senderAccount.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      balanceOnChain04 = (
        await recipientAccount.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      expect(balanceOnChain03).toBe(undefined);
      expect(balanceOnChain04).toEqual("100");
    });
  });
});

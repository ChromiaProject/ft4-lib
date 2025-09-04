import {
  Blockchain,
  createChromiaClientToMultichain,
  fetchBlockchains,
  NODE_URL,
} from "@ft4-test/util";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  checkBalances,
  createTransferAndStopIt,
  initAndCancelCrosschainTransfer,
  initApplyCancelUnapplyCrosschainTransfer,
  setupTestWithCrosschainTransfer,
} from "./crosschain-helpers";
import { GTX, MERKLE_HASH_VERSIONS } from "postchain-client";
import {
  isUnclaimedTransfer,
  recallUnclaimedCrosschainTransfer,
  solvePendingCrosschainTransfer,
  UnclaimedTransferStatus,
} from "@ft4/crosschain";
import { Asset } from "@ft4/asset";
import { AuthenticatedAccount } from "@ft4/accounts";
import { minutes } from "@ft4/authentication";
import { getTransactionRid } from "@ft4/utils";

let multichain00: Blockchain;
let multichain01: Blockchain;
let multichain02: Blockchain;
let connection00: Connection;
let connection01: Connection;
let connection02: Connection;
let path: Connection[];

describe("solve crosschain transfer", () => {
  beforeAll(async () => {
    const blockchains = await fetchBlockchains(false, MERKLE_HASH_VERSIONS.ONE);
    multichain00 = blockchains.multichain00;
    multichain01 = blockchains.multichain01;
    multichain02 = blockchains.multichain02;

    connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid, NODE_URL),
    );
    connection01 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid, NODE_URL),
    );
    connection02 = createConnection(
      await createChromiaClientToMultichain(multichain02.rid, NODE_URL),
    );

    path = [connection00, connection01, connection02];
  });

  describe("Can solve pending crosschain transfers", () => {
    it("inited transfer", async () => {
      await testTransfer(0);
    });

    it("inited and applied transfer", async () => {
      await testTransfer(1);
    });

    it("not completed transfer", async () => {
      await testTransfer(2);
    });
  });

  describe("Can solve expired crosschain transfers", () => {
    it("inited transfer", async () => {
      const event = (s, r, a) =>
        createTransferAndStopIt(s, r.id, multichain02.rid, a, 0, true);

      await testExpiredTransfer(event);
    });

    it("inited and applied transfer", async () => {
      const event = (s, r, a) =>
        createTransferAndStopIt(s, r.id, multichain02.rid, a, 1, true);

      await testExpiredTransfer(event);
    });

    it("inited and canceled transfer", async () => {
      const event = (s, r, a) =>
        initAndCancelCrosschainTransfer(r.id, a, multichain02.rid, s);

      await testExpiredTransfer(event);
    });

    it("inited applied canceled and unapplied transfer", async () => {
      const event = (s, r, a) =>
        initApplyCancelUnapplyCrosschainTransfer(r.id, a, multichain02.rid, s);

      await testExpiredTransfer(event);
    });
  });

  describe("Can solve unclaimed crosschain transfers", () => {
    it("with solve orchestrator", async () => {
      const assetName = "solve-orchestrator-test-asset";

      const { senderAccount, asset } = await setupTestWithCrosschainTransfer(
        [connection00, connection01],
        assetName,
        false,
      );

      await checkBalances(senderAccount, undefined, asset, { sender: 100 });

      const { initTx } = await createTransferAndStopIt(
        senderAccount,
        senderAccount.id,
        multichain01.rid,
        asset,
        1, // prevent confirmation
        true,
        2000,
      );

      expect(
        await isUnclaimedTransfer(
          getTransactionRid(initTx, connection00),
          1,
          connection00,
        ),
      ).toBe(UnclaimedTransferStatus.MustBeRecalled);

      await solvePendingCrosschainTransfer(connection00, {
        tx: initTx,
        opIndex: 1,
      });

      await checkBalances(senderAccount, undefined, asset, {
        sender: 100,
      });
    });

    it("with recall orchestrator", async () => {
      const assetName = "solve-orchestrator-test-asset";

      const { senderAccount, asset } = await setupTestWithCrosschainTransfer(
        [connection00, connection01],
        assetName,
        false,
      );

      const { initTx } = await createTransferAndStopIt(
        senderAccount,
        senderAccount.id,
        multichain01.rid,
        asset,
        2, // make it go through all hops
        true,
        2000,
      );

      expect(
        await isUnclaimedTransfer(
          getTransactionRid(initTx, connection00),
          1,
          connection00,
        ),
      ).toBe(UnclaimedTransferStatus.MustBeRecalled);

      await recallUnclaimedCrosschainTransfer(connection00, {
        tx: initTx,
        opIndex: 1,
      });

      await checkBalances(senderAccount, undefined, asset, {
        sender: 100,
      });
    });
  });
});

async function testTransfer(stopAfterHops: number) {
  const { senderAccount, recipientAccount, asset } =
    await setupTestWithCrosschainTransfer(path, getAssetName(), true);

  await checkBalances(senderAccount, recipientAccount, asset, { sender: 100 });

  const { initTx } = await createTransferAndStopIt(
    senderAccount,
    recipientAccount.id,
    multichain02.rid,
    asset,
    stopAfterHops,
    false,
    minutes(1),
  );

  await solvePendingCrosschainTransfer(connection00, {
    tx: initTx,
    opIndex: 1,
  });

  await checkBalances(senderAccount, recipientAccount, asset, {
    recipient: 100,
  });
}

async function testExpiredTransfer(
  event: (
    sender: AuthenticatedAccount,
    recipient: AuthenticatedAccount,
    asset: Asset,
  ) => Promise<{ initTx: GTX }>,
) {
  const { senderAccount, recipientAccount, asset } =
    await setupTestWithCrosschainTransfer(path, getAssetName(), true);

  await checkBalances(senderAccount, recipientAccount, asset, { sender: 100 });

  const { initTx } = await event(senderAccount, recipientAccount, asset);

  await solvePendingCrosschainTransfer(connection00, {
    tx: initTx,
    opIndex: 1,
  });

  await checkBalances(senderAccount, recipientAccount, asset, {
    sender: 100,
  });
}

let i = 0;
function getAssetName() {
  return `solve-transfer-test-asset-${i++}`;
}

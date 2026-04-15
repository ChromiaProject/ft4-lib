import { createAmount } from "@ft4/asset";
import { noopAuthenticator } from "@ft4/authentication";
import {
  cancelTransfer,
  crosschainTransfer,
  initTransfer,
} from "@ft4/crosschain";
import {
  AppliedTransfer,
  AssetOriginFilter,
  PendingTransfer,
  PendingTransferFilter,
  Transfer,
  TransferFilter,
  TransferRef,
} from "@ft4/crosschain/types";
import { transactionBuilder } from "@ft4/transaction-builder";
import { nop, PaginatedEntity, getTransactionRid } from "@ft4/utils";
import { applyTransfer, unapplyTransfer } from "@ft4/crosschain/operations";
import {
  TestContext,
  setupTestEnvironment,
  setupTestEnvironmentWithAssetInfo,
  TestContextWithOptionalAccounts,
} from "./common-setup";
import { createSession } from "@ft4/ft-session";
import { adminUser, emptyOp } from "@ft4-test/util";
import { registerCrosschainAsset } from "@ft4/admin";
import { IClient } from "postchain-client";

export async function setupApplyCrosschainTransferAndGetAppliedTransfer(
  assetName: string = "asset-name",
  filter: TransferFilter | null = null,
): Promise<{
  testContext: TestContext;
  appliedTransfer: AppliedTransfer;
  appliedTransfersFiltered: PaginatedEntity<AppliedTransfer>;
}> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);

  const txRids: Buffer[] = [];

  const transferRef = await testContext.account0
    .crosschainTransfer(
      testContext.multichain2.rid,
      testContext.account2.id,
      testContext.sampleAsset.id,
      createAmount(10, mintAmount.decimals),
    )
    .on("hop", (hopData) => {
      txRids.push(hopData.txRid);
    });

  const appliedTransfersFiltered =
    await testContext.connection2.getAppliedTransfersFiltered(filter);

  return {
    appliedTransfersFiltered,
    testContext,
    appliedTransfer: {
      initTxRid: getTransactionRid(transferRef.tx, testContext.connection0),
      initOpIndex: transferRef.opIndex,
      transactionId: txRids[txRids.length - 2], // last is complete_transfer
      opIndex: transferRef.opIndex,
    },
  };
}

export async function cancelCrosschainTransferAndGetCanceledTransfer(
  assetName: string = "asset-name",
): Promise<{
  testContext: TestContext;
  canceledTransfer: Transfer;
  canceledTransferFiltered: PaginatedEntity<Transfer>;
}> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);

  const state = {} as any;
  await testContext.session0
    .transactionBuilder()
    .add(
      initTransfer(
        testContext.account1.id,
        testContext.sampleAsset.id,
        createAmount(10, mintAmount.decimals),
        [testContext.multichain2.rid],
        Date.now(),
      ),
    )
    .buildAndSendWithAnchoring()
    .then((data) => {
      state.tx = data.tx;
      state.initialOpIndex = 1;
      state.initialTx = data.tx;
      state.opIndex = 1;
      state.proof = data.systemConfirmationProof(testContext.multichain2.rid);
    });

  state.proof = await state.proof;

  // Force block building to get past deadline
  await createSession(
    testContext.connection2,
    testContext.account2.authenticator,
  )
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const cancelOperation = cancelTransfer(
    state.tx,
    state.opIndex,
    state.tx,
    state.opIndex,
    0,
  );

  const { receipt } = await transactionBuilder(
    noopAuthenticator,
    testContext.connection2.client,
  )
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(cancelOperation)
    .buildAndSendWithAnchoring();

  const canceledTransferFiltered =
    await testContext.connection2.getCanceledTransfersFiltered(null);

  return {
    canceledTransferFiltered,
    testContext,
    canceledTransfer: {
      initTxRid: getTransactionRid(state.initialTx, testContext.connection0),
      initOpIndex: state.opIndex,
      transactionRid: receipt.transactionRid,
      opIndex: 1,
    },
  };
}

export async function unapplyCrosschainTransferAndGetUnappliedTransfer(
  assetName: string = "asset-name",
  filter: TransferFilter | null = null,
): Promise<{
  unappliedTransfersFiltered: PaginatedEntity<Transfer>;
  testContext: TestContext;
  unappliedTransfer: Transfer;
}> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);

  await registerCrosschainAsset(
    testContext.connection1.client,
    adminUser().signatureProvider,
    testContext.sampleAsset.id,
    testContext.multichain2.rid,
  );

  const initState = {} as any;
  const { receipt: initReceipt } = await testContext.session0
    .transactionBuilder()
    .add(
      initTransfer(
        testContext.account2.id,
        testContext.sampleAsset.id,
        createAmount(10, mintAmount.decimals),
        [testContext.multichain2.rid, testContext.multichain1.rid],
        // CI can take several seconds between hops; use a wider deadline to avoid
        // flaky "TRANSFER EXPIRED" failures in multichain query tests.
        Date.now() + 60000,
      ),
    )
    .buildAndSendWithAnchoring()
    .then((data) => {
      initState.tx = data.tx;
      initState.initialOpIndex = 1;
      initState.initialTx = data.tx;
      initState.opIndex = 1;
      initState.proof = data.systemConfirmationProof(
        testContext.multichain2.rid,
      );
      return data;
    });

  initState.proof = await initState.proof;

  const applyState = {} as any;
  await testContext.session2
    .transactionBuilder()
    .add(initState.proof, { authenticator: noopAuthenticator })
    .add(
      applyTransfer(
        initState.tx!,
        initState.opIndex!,
        initState.tx!,
        initState.opIndex!,
        0,
      ),
    )
    .buildAndSendWithAnchoring()
    .then((data) => {
      applyState.tx = data.tx;
      applyState.initialOpIndex = 1;
      applyState.initialTx = data.tx;
      applyState.opIndex = 2;
      applyState.proof = data.systemConfirmationProof(
        testContext.multichain2.rid,
      );
    });

  applyState.proof = await applyState.proof;

  // Force block building to get past deadline
  await createSession(testContext.connection1, noopAuthenticator)
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const cancelOperation = cancelTransfer(
    initState.tx,
    initState.initialOpIndex,
    applyState.tx,
    applyState.opIndex,
    1,
  );

  const cancelState = {} as any;
  await testContext.session1
    .transactionBuilder()
    .add(applyState.proof, { authenticator: noopAuthenticator })
    .add(cancelOperation, {
      authenticator: noopAuthenticator,
    })
    .buildAndSendWithAnchoring()
    .then((data) => {
      cancelState.tx = data?.tx;
      cancelState.opIndex = 1;
      cancelState.proof = data?.systemConfirmationProof(
        testContext.multichain1.rid,
      );
    });

  cancelState.proof = await cancelState.proof;

  // Force block building to get past deadline
  await createSession(testContext.connection2, noopAuthenticator)
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const unapplyOperation = unapplyTransfer(
    initState.tx,
    initState.opIndex,
    cancelState.tx,
    cancelState.opIndex,
    0,
  );

  const { receipt: unapplyReceipt } = await testContext.session2
    .transactionBuilder()
    .add(cancelState.proof, { authenticator: noopAuthenticator })
    .add(unapplyOperation, { authenticator: noopAuthenticator })
    .buildAndSendWithAnchoring();

  const unappliedTransfersFiltered =
    await testContext.connection2.getUnappliedTransfersFiltered(filter);

  return {
    unappliedTransfersFiltered,
    testContext,
    unappliedTransfer: {
      initTxRid: initReceipt.transactionRid,
      initOpIndex: 1,
      transactionRid: unapplyReceipt.transactionRid,
      opIndex: 1,
    },
  };
}

export async function recallCrosschainTransferAndGetRecalledTransfer(): Promise<{
  testContext: TestContextWithOptionalAccounts;
  recalledTransfer: Transfer;
}> {
  const testContext = await setupTestEnvironmentWithAssetInfo(
    "fee_strategy_timeout_test_asset_00",
    "FEE_STRATEGY_TIMEOUT_TEST_ASSET_00",
    5,
    undefined,
    [true, true],
  );

  await getOrRegisterCrosschainAsset(
    testContext.connection1.client,
    testContext.sampleAsset.id,
    testContext.multichain0.rid,
  );

  const balance = await testContext.account0.getBalanceByAssetId(
    testContext.sampleAsset.id,
  );

  const transferRef = await crosschainTransfer(
    testContext.connection0,
    testContext.account0.authenticator,
    testContext.connection1.blockchainRid,
    testContext.account0.id,
    testContext.sampleAsset.id,
    balance!.amount,
    5000, // ttl
  );

  let recallTxRid: Buffer | undefined;
  await testContext.account0
    .recallUnclaimedCrosschainTransfer(transferRef)
    .on("hop", (hopData) => {
      if (recallTxRid === undefined) {
        recallTxRid = hopData.txRid;
      }
    });

  return {
    testContext,
    recalledTransfer: {
      initTxRid: getTransactionRid(transferRef.tx, testContext.connection0),
      initOpIndex: transferRef.opIndex,
      opIndex: 0,
      transactionRid: recallTxRid,
    },
  };
}

export async function initCrosschainTransferAndGetPendingTransfer(
  assetName: string = "asset-name",
  filter: PendingTransferFilter | null = null,
): Promise<{
  pendingTransfersFiltered: PaginatedEntity<PendingTransfer>;
  testContext: TestContext;
  pendingTransfer: PendingTransfer;
}> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);

  const initOperation = initTransfer(
    testContext.account2.id,
    testContext.sampleAsset.id,
    createAmount(10, testContext.sampleAsset.decimals),
    [testContext.multichain2.rid],
    Date.now(),
  );

  await testContext.session0
    .transactionBuilder()
    .add(initOperation)
    .buildAndSendWithAnchoring();

  const pendingTransfersFiltered =
    await testContext.connection0.getPendingTransfersFiltered(filter);

  return {
    pendingTransfersFiltered,
    testContext,
    pendingTransfer: {
      tx: pendingTransfersFiltered.data[0].tx,
      opIndex: pendingTransfersFiltered.data[0].opIndex,
      senderAccount: pendingTransfersFiltered.data[0].senderAccount,
    },
  };
}

export async function revertTransferAndGetRevertedTransfer(
  assetName: string = "asset-name",
  filter: TransferFilter | null = null,
): Promise<{
  revertedTransfersFiltered: PaginatedEntity<Transfer>;
  testContext: TestContext;
  revertedTransfer: Transfer;
}> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);

  const initOperation = initTransfer(
    testContext.account2.id,
    testContext.sampleAsset.id,
    createAmount(10, testContext.sampleAsset.decimals),
    [testContext.multichain2.rid],
    Date.now(),
  );

  const { receipt } = await testContext.session0
    .transactionBuilder()
    .add(initOperation)
    .buildAndSendWithAnchoring();

  // Force block building to get past deadline
  await createSession(testContext.connection2, noopAuthenticator)
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const pendingTransfers =
    await testContext.account0.getPendingCrosschainTransfers();

  const transferRef: TransferRef = {
    tx: pendingTransfers.data[0].tx,
    opIndex: pendingTransfers.data[0].opIndex,
  };

  let finalTxRid: Buffer | undefined;
  await testContext.account0
    .revertCrosschainTransfer(transferRef)
    .on("hop", (hopData) => {
      finalTxRid = hopData.txRid;
    });

  const revertedTransfersFiltered =
    await testContext.connection0.getRevertedTransfersFiltered(filter);

  return {
    revertedTransfersFiltered,
    testContext,
    revertedTransfer: {
      initTxRid: receipt.transactionRid,
      initOpIndex: 1,
      transactionRid: finalTxRid,
      opIndex: 1,
    },
  };
}

export function setAssetOriginFilter(
  assetIds: Array<Buffer> | null = null,
): AssetOriginFilter {
  return { assetIds };
}

export function setTransferFilter(
  initTxRids: Array<Buffer> | null = null,
  initOpIndex: number | null = null,
): TransferFilter {
  return { initTxRids, initOpIndex };
}

export function setPendingTransferFilter(
  transactionIds: Array<Buffer> | null = null,
  initOpIndex: number | null = null,
  senderAccountId: Buffer | null = null,
) {
  return { transactionIds, initOpIndex, senderAccountId };
}

async function getOrRegisterCrosschainAsset(
  client: IClient,
  assetId: Buffer,
  originMultichainRid: Buffer,
): Promise<void> {
  try {
    await registerCrosschainAsset(
      client,
      adminUser().signatureProvider,
      assetId,
      originMultichainRid,
    );
  } catch (error) {
    console.log(
      `Crosschain asset with id ${assetId.toString("hex")} already exists`,
    );
  }
}

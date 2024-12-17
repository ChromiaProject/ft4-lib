import { createAmount } from "@ft4/asset";
import { noopAuthenticator } from "@ft4/authentication";
import { cancelTransfer, initTransfer } from "@ft4/crosschain";
import {
  AppliedTransfer,
  AssetOriginFilter,
  PendingTransfer_,
  PendingTransferFilter,
  Transfer,
  TransferFilter,
} from "@ft4/crosschain/types";
import {
  OnAnchoredHandlerData,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { getTransactionRid, nop, PaginatedEntity } from "@ft4/utils";
import { unapplyTransfer } from "@ft4/crosschain/operations";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { createSession } from "@ft4/ft-session";
import { emptyOp } from "@ft4-test/util";

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

  const transferRef = await testContext.account0.crosschainTransfer(
    testContext.multichain2.rid,
    testContext.account2.id,
    testContext.sampleAsset.id,
    createAmount(10, mintAmount.decimals),
  );

  const txRid = getTransactionRid(transferRef.tx);

  const appliedTransfersFiltered =
    await testContext.connection2.getAppliedTransfersFiltered(filter, 1);

  // Returns transaction id not matching
  return {
    appliedTransfersFiltered,
    testContext,
    appliedTransfer: {
      rowId: appliedTransfersFiltered.data[0].rowId,
      initTxRid: txRid,
      initOpIndex: transferRef.opIndex,
      transactionId: txRid,
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
        [testContext.multichain1.rid],
        Date.now() + 10000,
      ),
      {
        targetBlockchainRid: testContext.multichain2.rid,
        onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
          state.tx = data?.tx;
          state.initialOpIndex = data?.opIndex;
          state.initialTx = data?.tx;
          state.opIndex = data?.opIndex;
          state.proof = data?.createProof(testContext.multichain2.rid);
        },
      },
    )
    .buildAndSendWithAnchoring();

  state.proof = await state.proof;

  const txRid = getTransactionRid(state.tx);

  await createSession(
    testContext.connection2,
    testContext.account2.authenticator,
  )
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const pendingTransfers =
    await testContext.account0.getPendingCrosschainTransfers();

  const cancelOperation = cancelTransfer(
    pendingTransfers[0].tx,
    pendingTransfers[0].opIndex,
    state.tx,
    state.opIndex,
    1,
  );

  await transactionBuilder(
    testContext.account0.authenticator,
    testContext.connection2.client,
  )
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(cancelOperation)
    .buildAndSendWithAnchoring();

  const canceledTransferFiltered =
    await testContext.connection2.getCanceledTransfersFiltered(null, 1);

  return {
    canceledTransferFiltered,
    testContext,
    canceledTransfer: {
      rowId: canceledTransferFiltered.data[0].rowId,
      initTxRid: txRid,
      initOpIndex: state.opIndex,
    },
  };
}

export async function unapplyCrosschainTransferAndGetUnappliedTransfer(
  assetName: string = "asset-name",
): Promise<{ testContext: TestContext; unappliedTransfer: Transfer }> {
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
        [testContext.multichain1.rid],
        Date.now() + 10000,
      ),
      {
        targetBlockchainRid: testContext.multichain2.rid,
        onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
          state.tx = data?.tx;
          state.initialOpIndex = data?.opIndex;
          state.initialTx = data?.tx;
          state.opIndex = data?.opIndex;
          state.proof = data?.createProof(testContext.multichain2.rid);
        },
      },
    )
    .buildAndSendWithAnchoring();

  state.proof = await state.proof;
  const txRid = getTransactionRid(state.tx);

  const unapplyOperation = unapplyTransfer(
    state.tx,
    state.opIndex,
    state.tx,
    state.opIndex,
    0,
  );

  await transactionBuilder(
    testContext.account0.authenticator,
    testContext.connection2.client,
  )
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(unapplyOperation)
    .buildAndSendWithAnchoring();

  return {
    testContext,
    unappliedTransfer: {
      rowId: expect.any(Number),
      initTxRid: txRid,
      initOpIndex: state.opIndex,
    },
  };
}

export async function recallCrosschainTransferAndGetRecalledTransfer(
  assetName: string = "asset-name",
): Promise<{ testContext: TestContext; recalledTransfer: Transfer }> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);

  const transferRef = await testContext.account0.crosschainTransfer(
    testContext.multichain2.rid,
    testContext.account2.id,
    testContext.sampleAsset.id,
    createAmount(10, mintAmount.decimals),
    10000000000000,
  );

  await testContext.account0.recallUnclaimedCrosschainTransfer(transferRef);

  const txRid = getTransactionRid(transferRef.tx);

  return {
    testContext,
    recalledTransfer: {
      rowId: expect.any(Number),
      initTxRid: txRid,
      initOpIndex: transferRef.opIndex,
    },
  };
}

export async function initCrosschainTransferAndGetPendingTransfer(
  assetName: string = "asset-name",
  filter: PendingTransferFilter | null = null,
): Promise<{
  pendingTransfersFiltered: PaginatedEntity<PendingTransfer_>;
  testContext: TestContext;
  pendingTransfer: PendingTransfer_;
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

  let txRid: Buffer;
  await testContext.session0
    .transactionBuilder()
    .add(initOperation)
    .buildAndSendWithAnchoring()
    .then((res) => (txRid = res.receipt.transactionRid));

  const pendingTransfers =
    await testContext.account0.getPendingCrosschainTransfers();
  const foundPendingTransfer = pendingTransfers.data[0];

  const pendingTransfersFiltered =
    await testContext.connection0.getPendingTransfersFiltered(filter, 1);

  return {
    pendingTransfersFiltered,
    testContext,
    pendingTransfer: {
      rowId: pendingTransfersFiltered.data[0].rowId,
      transactionId: txRid!,
      opIndex: foundPendingTransfer.opIndex,
      senderAccountId: testContext.account0.id,
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

  let txRid: Buffer;
  await testContext.session0
    .transactionBuilder()
    .add(initOperation)
    .buildAndSendWithAnchoring()
    .then((res) => (txRid = res.receipt.transactionRid));

  // Force block building to get past deadline
  await createSession(
    testContext.connection2,
    testContext.account2.authenticator,
  )
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const pendingTransfers =
    await testContext.account0.getPendingCrosschainTransfers();

  await testContext.account0.revertCrosschainTransfer(pendingTransfers.data[0]);

  const revertedTransfersFiltered =
    await testContext.connection0.getRevertedTransfersFiltered(filter, 1);

  return {
    revertedTransfersFiltered,
    testContext,
    revertedTransfer: {
      rowId: revertedTransfersFiltered.data[0].rowId,
      initTxRid: txRid!,
      initOpIndex: pendingTransfers.data[0].opIndex,
    },
  };
}

export function setAssetOriginFilter(
  rowids: Array<number> = [],
  assetId: Buffer | null = null,
): AssetOriginFilter {
  return { rowids, assetId };
}

export function setTransferFilter(
  rowids: Array<number> = [],
  initTxRid: Buffer | null = null,
  initOpIndex: number | null = null,
): TransferFilter {
  return { rowids, initTxRid, initOpIndex };
}

export function setPendingTransferFilter(
  rowids: Array<number> = [],
  transactionId: Buffer | null = null,
  initOpIndex: number | null = null,
  senderAccountId: Buffer | null = null,
) {
  return { rowids, transactionId, initOpIndex, senderAccountId };
}

import { AccountBuilder, Blockchain } from "@ft4-test/util";
import { AuthFlag } from "@ft4/accounts";
import { Asset, createAmount } from "@ft4/asset";
import { noopAuthenticator } from "@ft4/authentication";
import { cancelTransfer, initTransfer } from "@ft4/crosschain";
import {
  AppliedTransfer,
  AssetOriginFilter,
  PendingTransfer_,
  Transfer,
  TransferFilter,
} from "@ft4/crosschain/types";
import { Connection, Session } from "@ft4/ft-session";
import { transactionBuilder } from "@ft4/transaction-builder";
import { getTransactionRid } from "@ft4/utils";
import { unapplyTransfer } from "@ft4/crosschain/operations";
import { TestContext, setupTestEnvironment } from "./common-setup";
import {
  createClient,
  createIccfProofTx,
  formatter,
  gtv,
} from "postchain-client";

export async function setupApplyCrosschainTransferAndGetAppliedTransfer(
  assetName: string = "asset-name",
): Promise<{
  testContext: TestContext;
  appliedTransfer: AppliedTransfer;
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

  return {
    testContext,
    appliedTransfer: {
      rowId: expect.any(Number),
      initTxRid: txRid,
      initOpIndex: transferRef.opIndex,
      transactionId: txRid,
      opIndex: transferRef.opIndex,
    },
  };
}

export async function cancelCrosschainTransferAndGetCanceledTransfer(
  assetName: string = "asset-name",
): Promise<{ testContext: TestContext; canceledTransfer: Transfer }> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);

  const transferRef = await testContext.account0.crosschainTransfer(
    testContext.multichain2.rid,
    testContext.account2.id,
    testContext.sampleAsset.id,
    createAmount(10, mintAmount.decimals),
    1577836820000,
  );

  const directoryClient = await createClient({
    nodeUrlPool: testContext.connection0.client.config.endpointPool.map(
      (ep) => ep.url,
    ),
    blockchainIid: 0,
  });

  const iccfOp = (
    await createIccfProofTx(
      directoryClient,
      getTransactionRid(transferRef.tx),
      gtv.gtvHash(transferRef.tx),
      transferRef.tx[0][2],
      formatter.toString(testContext.multichain0.rid),
      formatter.toString(testContext.multichain2.rid),
      undefined,
      true,
    )
  ).iccfTx.operations[0];

  const cancelOperation = cancelTransfer(
    transferRef.tx,
    transferRef.opIndex,
    transferRef.tx,
    transferRef.opIndex,
    0,
  );

  await transactionBuilder(
    testContext.account0.authenticator,
    testContext.connection2.client,
  )
    .add(iccfOp, { authenticator: noopAuthenticator })
    .add(cancelOperation)
    .buildAndSendWithAnchoring();

  const txRid = getTransactionRid(transferRef.tx);

  return {
    testContext,
    canceledTransfer: {
      rowId: expect.any(Number),
      initTxRid: txRid,
      initOpIndex: transferRef.opIndex,
    },
  };
}

export async function unapplyCrosschainTransferAndGetUnappliedTransfer(
  assetName: string = "asset-name",
): Promise<{ testContext: TestContext; unappliedTransfer: Transfer }> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);

  const transferRef = await testContext.account0.crosschainTransfer(
    testContext.multichain2.rid,
    testContext.account2.id,
    testContext.sampleAsset.id,
    createAmount(10, mintAmount.decimals),
    1577836820000,
  );

  const cancelOperation = cancelTransfer(
    transferRef.tx,
    transferRef.opIndex,
    transferRef.tx,
    transferRef.opIndex,
    0,
  );

  const directoryClient = await createClient({
    nodeUrlPool: testContext.connection0.client.config.endpointPool.map(
      (ep) => ep.url,
    ),
    blockchainIid: 0,
  });

  const iccfOp = (
    await createIccfProofTx(
      directoryClient,
      getTransactionRid(transferRef.tx),
      gtv.gtvHash(transferRef.tx),
      transferRef.tx[0][2],
      formatter.toString(testContext.multichain0.rid),
      formatter.toString(testContext.multichain2.rid),
      undefined,
      true,
    )
  ).iccfTx.operations[0];

  await transactionBuilder(
    testContext.account0.authenticator,
    testContext.connection2.client,
  )
    .add(iccfOp, { authenticator: noopAuthenticator })
    .add(cancelOperation)
    .buildAndSendWithAnchoring();

  const unapplyOperation = unapplyTransfer(
    transferRef.tx,
    transferRef.opIndex,
    transferRef.tx,
    transferRef.opIndex,
    [testContext.multichain2.rid].length - 1,
  );

  await transactionBuilder(
    testContext.account0.authenticator,
    testContext.connection2.client,
  )
    .add(iccfOp, { authenticator: noopAuthenticator })
    .add(unapplyOperation)
    .buildAndSendWithAnchoring();

  const txRid = getTransactionRid(transferRef.tx);

  return {
    testContext,
    unappliedTransfer: {
      rowId: expect.any(Number),
      initTxRid: txRid,
      initOpIndex: transferRef.opIndex,
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
  connection0: Connection,
  connection1: Connection,
  asset: Asset,
  recipientBlockchain: Blockchain,
  sendersSession: Session,
): Promise<PendingTransfer_> {
  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .withBalance(asset, createAmount(10, asset.decimals))
    .build();

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const initOperation = initTransfer(
    account1.id,
    asset.id,
    createAmount(10, asset.decimals),
    [recipientBlockchain.rid],
    Date.now(),
  );

  await sendersSession
    .transactionBuilder()
    .add(initOperation)
    .buildAndSendWithAnchoring();

  const pendingTransfers = await account0.getPendingCrosschainTransfers();
  const foundPendingTransfer = pendingTransfers.data[0];

  return {
    rowId: expect.any(Number),
    transactionId: getTransactionRid(foundPendingTransfer.tx),
    opIndex: foundPendingTransfer.opIndex,
    senderAccountId: account0.id,
  };
}

export async function revertTransferAndGetRevertedTransfer(
  connection0: Connection,
  connection1: Connection,
  asset: Asset,
  recipientBlockchain: Blockchain,
  session: Session,
): Promise<Transfer> {
  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .withBalance(asset, createAmount(10, asset.decimals))
    .build();

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const initOperation = initTransfer(
    account1.id,
    asset.id,
    createAmount(10, asset.decimals),
    [recipientBlockchain.rid],
    Date.now(),
  );

  await session
    .transactionBuilder()
    .add(initOperation)
    .buildAndSendWithAnchoring();

  const pendingTransfers = await account0.getPendingCrosschainTransfers();
  const foundPendingTransfer = pendingTransfers.data[0];
  await account0.revertCrosschainTransfer(foundPendingTransfer);

  const txRid = getTransactionRid(foundPendingTransfer.tx);

  return {
    rowId: expect.any(Number),
    initTxRid: txRid,
    initOpIndex: foundPendingTransfer.opIndex,
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

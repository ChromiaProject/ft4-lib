import { createAmount, createAmountFromBalance } from "@ft4/asset";
import {
  createInMemoryFtKeyStore,
  noopAuthenticator,
} from "@ft4/authentication";
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
import { nop, PaginatedEntity } from "@ft4/utils";
import { applyTransfer, unapplyTransfer } from "@ft4/crosschain/operations";
import { TestContext, setupTestEnvironment } from "./common-setup";
import { createSession } from "@ft4/ft-session";
import { adminUser, emptyOp, getNewAsset } from "@ft4-test/util";
import { mint, registerCrosschainAsset } from "@ft4/admin";
import {
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts";
import { encryption, gtv, IClient } from "postchain-client";
import {
  feeAssets,
  registerAccount,
  registrationStrategy,
} from "@ft4/registration";
import { MERKLE_HASH_VERSIONS } from "@ft4/utils/main";

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

  const appliedTransfersFiltered =
    await testContext.connection2.getAppliedTransfersFiltered(filter, 1);

  return {
    appliedTransfersFiltered,
    testContext,
    appliedTransfer: {
      initTxRid: appliedTransfersFiltered.data[0].initTxRid,
      initOpIndex: transferRef.opIndex,
      transactionId: appliedTransfersFiltered.data[0].transactionId,
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
      initTxRid: canceledTransferFiltered.data[0].initTxRid,
      initOpIndex: state.opIndex,
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
  await testContext.session0
    .transactionBuilder()
    .add(
      initTransfer(
        testContext.account2.id,
        testContext.sampleAsset.id,
        createAmount(10, mintAmount.decimals),
        [testContext.multichain2.rid, testContext.multichain1.rid],
        Date.now() + 5000,
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
  await createSession(
    testContext.connection1,
    testContext.account1.authenticator,
  )
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
  await createSession(
    testContext.connection2,
    testContext.account2.authenticator,
  )
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

  await testContext.session2
    .transactionBuilder()
    .add(cancelState.proof, { authenticator: noopAuthenticator })
    .add(unapplyOperation)
    .buildAndSendWithAnchoring();

  const unappliedTransfersFiltered =
    await testContext.connection2.getUnappliedTransfersFiltered(filter, 1);

  return {
    unappliedTransfersFiltered,
    testContext,
    unappliedTransfer: {
      initTxRid: unappliedTransfersFiltered.data[0].initTxRid,
      initOpIndex: initState.opIndex,
    },
  };
}

export async function recallCrosschainTransferAndGetRecalledTransfer(
  assetName: string = "asset-name",
  filter: TransferFilter | null = null,
): Promise<{
  testContext: TestContext;
  recalledTransfersFiltered: PaginatedEntity<Transfer>;
  recalledTransfer: Transfer;
}> {
  const mintAmount = createAmount(100, 0);
  const testContext = await setupTestEnvironment(assetName, mintAmount);
  const asset = await getNewAsset(
    testContext.connection0.client,
    "fee_strategy_timeout_test_asset_00",
    "FEE_STRATEGY_TIMEOUT_TEST_ASSET_00",
    5,
  );

  await getOrRegisterCrosschainAsset(
    testContext.connection1.client,
    asset.id,
    testContext.multichain0.rid,
  );
  const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());
  const authDescriptor = createSingleSigAuthDescriptorRegistration(
    [AuthFlag.Account, AuthFlag.Transfer],
    keyStore.id,
  );

  const senderSession = (
    await registerAccount(
      testContext.connection0.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    )
  ).session;
  const senderAccount = senderSession.account;

  const feeAmounts = await testContext.connection1.query(feeAssets());
  const amount = feeAmounts.find((amt) =>
    amt.asset_id.equals(asset.id),
  )!.amount;

  const feeAmount = createAmountFromBalance(amount, asset.decimals);
  await mint(
    testContext.connection0.client,
    adminUser().signatureProvider,
    senderAccount.id,
    asset.id,
    feeAmount,
  );

  const recipientId = gtv.gtvHash(keyStore.id, MERKLE_HASH_VERSIONS.ONE);

  const transferRef = await crosschainTransfer(
    testContext.connection0,
    senderAccount.authenticator,
    testContext.connection1.blockchainRid,
    recipientId,
    asset.id,
    feeAmount,
    5000, // ttl
  );

  await senderSession.account.recallUnclaimedCrosschainTransfer(transferRef);

  const recalledTransfersFiltered =
    await testContext.connection1.getRecalledTransfersFiltered(filter, 1);

  return {
    testContext,
    recalledTransfersFiltered,
    recalledTransfer: {
      initTxRid: recalledTransfersFiltered.data[0].initTxRid,
      initOpIndex: transferRef.opIndex,
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
    await testContext.connection0.getPendingTransfersFiltered(filter, 1);

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

  await testContext.session0
    .transactionBuilder()
    .add(initOperation)
    .buildAndSendWithAnchoring();

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

  const transferRef: TransferRef = {
    tx: pendingTransfers.data[0].tx,
    opIndex: pendingTransfers.data[0].opIndex,
  };

  await testContext.account0.revertCrosschainTransfer(transferRef);

  const revertedTransfersFiltered =
    await testContext.connection0.getRevertedTransfersFiltered(filter, 1);

  return {
    revertedTransfersFiltered,
    testContext,
    revertedTransfer: {
      initTxRid: revertedTransfersFiltered.data[0].initTxRid,
      initOpIndex: revertedTransfersFiltered.data[0].initOpIndex,
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
    console.log(`Crosschain asset with id ${assetId} already exists`);
  }
}

import { AccountBuilder, Blockchain } from "@ft4-test/util";
import { AuthFlag } from "@ft4/accounts";
import { Asset, createAmount } from "@ft4/asset";
import { days, noopAuthenticator } from "@ft4/authentication";
import {
  applyTransfer,
  cancelTransfer,
  initTransfer,
  revertTransfer,
} from "@ft4/crosschain";
import {
  AppliedTransfer,
  AssetOrigin,
  AssetOriginFilter,
  PendingTransfer_,
  Transfer,
  TransferFilter,
} from "@ft4/crosschain/types";
import { Connection, Session } from "@ft4/ft-session";
import {
  OnAnchoredHandlerData,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { getTransactionRid } from "@ft4/utils";
import { IClient, SignatureProvider } from "postchain-client";
import { registerCrosschainAsset } from "@ft4/admin";
import {
  recallUnclaimedTransfer,
  unapplyTransfer,
} from "@ft4/crosschain/operations";

export async function setupApplyCrosschainTransferAndGetAppliedTransfer(
  connection0: Connection,
  connection1: Connection,
  connection2: Connection,
  asset: Asset,
  multichain: Blockchain,
  session: Session,
): Promise<AppliedTransfer> {
  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .withBalance(asset, createAmount(10, asset.decimals))
    .build();

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const state = {} as any;

  const initOperation = initTransfer(
    account1.id,
    asset.id,
    createAmount(10, asset.decimals),
    [multichain.rid],
    10000000000000,
  );

  await session
    .transactionBuilder()
    .add(initOperation, {
      targetBlockchainRid: multichain.rid,
      onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
        state.tx = data?.tx;
        state.initialOpIndex = data?.opIndex;
        state.initialTx = data?.tx;
        state.opIndex = data?.opIndex;
        state.proof = data?.createProof(multichain.rid);
      },
    })
    .buildAndSendWithAnchoring();

  state.proof = await state.proof!;

  const applyOperation = applyTransfer(
    state.initialTx!,
    state.initialOpIndex!,
    state.tx!,
    state.opIndex!,
    0,
  );

  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(applyOperation, {
      authenticator: noopAuthenticator,
      targetBlockchainRid: connection0.blockchainRid,
      onAnchoredHandler: () => {},
    })
    .buildAndSendWithAnchoring();

  return {
    rowId: expect.any(Number),
    initTxRid: state.tx.tx_rid,
    initOpIndex: state.initialOpIndex,
    transactionId: getTransactionRid(state.tx),
    opIndex: state.opIndex,
  };
}

export async function registerCrosschainAssetAndGetCrosschainAsset(
  client: IClient,
  signatureProvider: SignatureProvider,
  asset: Asset,
  originBlockchainRid: Buffer,
): Promise<AssetOrigin> {
  try {
    await registerCrosschainAsset(
      client,
      signatureProvider,
      asset.id,
      originBlockchainRid,
    );
  } catch (error) {
    throw new Error(error);
  }

  return {
    rowId: expect.any(Number),
    asset,
    originBlockchainRid,
  };
}

export async function cancelCrosschainTransferAndGetCanceledTransfer(
  connection0: Connection,
  connection1: Connection,
  connection2: Connection,
  asset: Asset,
  multichain: Blockchain,
  session: Session,
): Promise<Transfer> {
  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .withBalance(asset, createAmount(10, asset.decimals))
    .build();

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const state = {} as any;

  const initOperation = initTransfer(
    account1.id,
    asset.id,
    createAmount(10, asset.decimals),
    [multichain.rid],
    10000000000000,
  );

  await session
    .transactionBuilder()
    .add(initOperation, {
      targetBlockchainRid: multichain.rid,
      onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
        state.tx = data?.tx;
        state.initialOpIndex = data?.opIndex;
        state.initialTx = data?.tx;
        state.opIndex = data?.opIndex;
        state.proof = data?.createProof(multichain.rid);
      },
    })
    .buildAndSendWithAnchoring();

  state.proof = await state.proof!;

  const applyOperation = applyTransfer(
    state.initialTx!,
    state.initialOpIndex!,
    state.tx!,
    state.opIndex!,
    0,
  );

  let applyTx: any;
  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(applyOperation, {
      authenticator: noopAuthenticator,
      targetBlockchainRid: connection0.blockchainRid,
      onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
        applyTx = data?.tx;
      },
    })
    .buildAndSendWithAnchoring();

  const cancelOperation = cancelTransfer(
    state.tx,
    state.initialOpIndex,
    applyTx,
    state.initialOpIndex,
    0,
  );

  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(cancelOperation)
    .buildAndSendWithAnchoring();

  return {
    rowId: expect.any(Number),
    initTxRid: state.tx.tx_rid,
    initOpIndex: state.initialOpIndex,
  };
}

export async function unapplyCrosschainTransferAndGetUnappliedTransfer(
  connection0: Connection,
  connection1: Connection,
  connection2: Connection,
  asset: Asset,
  multichain: Blockchain,
  session: Session,
): Promise<Transfer> {
  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .withBalance(asset, createAmount(10, asset.decimals))
    .build();

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const state = {} as any;

  const initOperation = initTransfer(
    account1.id,
    asset.id,
    createAmount(10, asset.decimals),
    [multichain.rid],
    10000000000000,
  );

  await session
    .transactionBuilder()
    .add(initOperation, {
      targetBlockchainRid: multichain.rid,
      onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
        state.tx = data?.tx;
        state.initialOpIndex = data?.opIndex;
        state.initialTx = data?.tx;
        state.opIndex = data?.opIndex;
        state.proof = data?.createProof(multichain.rid);
      },
    })
    .buildAndSendWithAnchoring();

  state.proof = await state.proof!;

  const applyOperation = applyTransfer(
    state.initialTx!,
    state.initialOpIndex!,
    state.tx!,
    state.opIndex!,
    0,
  );

  let applyTx: any;
  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(applyOperation, {
      authenticator: noopAuthenticator,
      targetBlockchainRid: connection0.blockchainRid,
      onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
        applyTx = data?.tx;
      },
    })
    .buildAndSendWithAnchoring();

  const cancelOperation = cancelTransfer(
    state.tx,
    state.initialOpIndex,
    applyTx,
    state.initialOpIndex,
    0,
  );

  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(cancelOperation)
    .buildAndSendWithAnchoring();

  const unapplyOperation = unapplyTransfer(
    state.tx,
    state.initialOpIndex,
    state.tx,
    state.initialOpIndex,
    [multichain.rid].length - 1,
  );

  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(unapplyOperation)
    .buildAndSendWithAnchoring();

  return {
    rowId: expect.any(Number),
    initTxRid: state.tx.tx_rid,
    initOpIndex: state.initialOpIndex,
  };
}

export async function recallCrosschainTransferAndGetRecalledTransfer(
  connection0: Connection,
  connection1: Connection,
  connection2: Connection,
  asset: Asset,
  multichain: Blockchain,
  session: Session,
): Promise<Transfer> {
  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .withBalance(asset, createAmount(10, asset.decimals))
    .build();

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const state = {} as any;

  const initOperation = initTransfer(
    account1.id,
    asset.id,
    createAmount(10, asset.decimals),
    [multichain.rid],
    10000000000000,
  );

  await session
    .transactionBuilder()
    .add(initOperation, {
      targetBlockchainRid: multichain.rid,
      onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
        state.tx = data?.tx;
        state.initialOpIndex = data?.opIndex;
        state.initialTx = data?.tx;
        state.opIndex = data?.opIndex;
        state.proof = data?.createProof(multichain.rid);
      },
    })
    .buildAndSendWithAnchoring();

  state.proof = await state.proof!;

  const applyOperation = applyTransfer(
    state.initialTx!,
    state.initialOpIndex!,
    state.tx!,
    state.opIndex!,
    0,
  );

  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(applyOperation, {
      authenticator: noopAuthenticator,
      targetBlockchainRid: connection0.blockchainRid,
      onAnchoredHandler: () => {},
    })
    .buildAndSendWithAnchoring();

  const recallOperation = recallUnclaimedTransfer(
    state.tx,
    state.initialOpIndex,
  );

  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(recallOperation)
    .buildAndSend();

  return {
    rowId: expect.any(Number),
    initTxRid: state.initialTx.tx_rid,
    initOpIndex: state.initialOpIndex,
  };
}

export async function initCrosschainTransferAndGetPendingTransfer(
  connection0: Connection,
  connection1: Connection,
  asset: Asset,
  multichain: Blockchain,
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
    [multichain.rid],
    Date.now() + days(1),
  );

  const state = {} as any;
  await sendersSession
    .transactionBuilder()
    .add(initOperation, {
      targetBlockchainRid: multichain.rid,
      onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
        state.tx = data?.tx;
        state.opIndex = data?.opIndex;
      },
    })
    .buildAndSendWithAnchoring();

  return {
    rowId: expect.any(Number),
    transactionId: getTransactionRid(state.tx),
    opIndex: state.opIndex,
    senderAccountId: account0.id,
  };
}

export async function revertTransferAndGetRevertedTransfer(
  connection0: Connection,
  connection1: Connection,
  connection2: Connection,
  asset: Asset,
  multichain: Blockchain,
  session: Session,
): Promise<Transfer> {
  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .withBalance(asset, createAmount(10, asset.decimals))
    .build();

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const state = {} as any;

  const initOperation = initTransfer(
    account1.id,
    asset.id,
    createAmount(10, asset.decimals),
    [multichain.rid],
    10000000000000,
  );

  await session
    .transactionBuilder()
    .add(initOperation, {
      targetBlockchainRid: multichain.rid,
      onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
        state.tx = data?.tx;
        state.initialOpIndex = data?.opIndex;
        state.initialTx = data?.tx;
        state.opIndex = data?.opIndex;
        state.proof = data?.createProof(multichain.rid);
      },
    })
    .buildAndSendWithAnchoring();

  state.proof = await state.proof!;

  const cancelOperation = cancelTransfer(
    state.tx,
    state.initialOpIndex,
    state.tx,
    state.initialOpIndex,
    0,
  );

  await transactionBuilder(account0.authenticator, connection2.client)
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(cancelOperation)
    .buildAndSendWithAnchoring();

  const revertOperation = revertTransfer(
    state.tx,
    state.opIndex,
    state.tx,
    state.opIndex,
  );

  await session
    .transactionBuilder()
    .add(state.proof, { authenticator: noopAuthenticator })
    .add(revertOperation, { authenticator: noopAuthenticator })
    .buildAndSend();

  return {
    rowId: expect.any(Number),
    initTxRid: state.tx.tx_rid,
    initOpIndex: state.initialOpIndex,
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

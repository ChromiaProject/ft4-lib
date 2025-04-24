import { emptyOp } from "@ft4-test/util";
import { Asset, createAmount } from "@ft4/asset";
import { noopAuthenticator } from "@ft4/authentication";
import {
  applyTransfer,
  cancelTransfer,
  initTransfer,
  unapplyTransfer,
} from "@ft4/crosschain";
import { Connection, createSession } from "@ft4/ft-session";
import {
  transactionBuilder,
  TransactionBuilder,
} from "@ft4/transaction-builder";
import { nop } from "@ft4/utils";
import { BufferId, GTX, Operation } from "postchain-client";

export async function initAndApplyCrosschainTransfer(
  receipientAccountId: BufferId,
  assetToTransfer: Asset,
  blockchainsPath: BufferId[],
  initTb: TransactionBuilder,
  applyTb: TransactionBuilder,
  transferDeadline: number = 10000000000000,
): Promise<{
  initTx: GTX;
  initOpIndex: number;
  applyTx: GTX;
  applyOpIndex: number;
  applyProof: Operation;
}> {
  const initOperation = initTransfer(
    receipientAccountId,
    assetToTransfer.id,
    createAmount(100, assetToTransfer.decimals),
    blockchainsPath,
    transferDeadline,
  );

  const { initTx, initOpIndex, initProof } = await initTb
    .add(initOperation)
    .buildAndSendWithAnchoring()
    .then(async (anchored) => {
      return {
        initTx: anchored.tx,
        initOpIndex: 1,
        initProof: await anchored.systemConfirmationProof(blockchainsPath[0]),
      };
    });

  const { applyTx, applyOpIndex, applyProof } = await applyTb
    .add(initProof)
    .add(applyTransfer(initTx, initOpIndex, initTx, initOpIndex, 0))
    .buildAndSendWithAnchoring()
    .then(async (anchored) => {
      return {
        applyTx: anchored.tx,
        applyOpIndex: 1,
        applyProof: await anchored.systemConfirmationProof(blockchainsPath[0]),
      };
    });

  return { initTx, initOpIndex, applyTx, applyOpIndex, applyProof };
}

export async function initAndCancelCrosschainTransfer(
  receipientAccountId: BufferId,
  assetToTransfer: Asset,
  blockchainsPath: BufferId[],
  transferDeadline: number,
  initTb: TransactionBuilder,
  cancelTb: TransactionBuilder,
  receipientConnection: Connection,
): Promise<void> {
  const initOperation = initTransfer(
    receipientAccountId,
    assetToTransfer.id,
    createAmount(100, assetToTransfer.decimals),
    blockchainsPath,
    transferDeadline,
  );

  const { initTx, initOpIndex, systemConfirmationProof } = await initTb
    .add(initOperation)
    .buildAndSendWithAnchoring()
    .then(async (anchored) => {
      return {
        initTx: anchored.tx,
        initOpIndex: 1,
        systemConfirmationProof: await anchored.systemConfirmationProof(
          blockchainsPath[0],
        ),
      };
    });

  // Force block building to get past deadline
  await createSession(receipientConnection, noopAuthenticator)
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const cancelOperation = cancelTransfer(
    initTx,
    initOpIndex,
    initTx,
    initOpIndex,
    0,
  );

  await cancelTb
    .add(systemConfirmationProof)
    .add(cancelOperation)
    .buildAndSendWithAnchoring();
}

export async function initApplyCancelUnapplyCrosschainTransfer(
  receipientAccountId: BufferId,
  assetToTransfer: Asset,
  blockchainsPath: BufferId[],
  transferDeadline: number,
  initTb: TransactionBuilder,
  applyTb: TransactionBuilder,
  receipientConnection: Connection,
  intermediateConnection: Connection,
): Promise<void> {
  const { initTx, initOpIndex, applyTx, applyOpIndex, applyProof } =
    await initAndApplyCrosschainTransfer(
      receipientAccountId,
      assetToTransfer,
      blockchainsPath,
      initTb,
      applyTb,
      transferDeadline,
    );

  // Force block building to get past deadline
  await createSession(receipientConnection, noopAuthenticator)
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const cancelOperation = cancelTransfer(
    initTx,
    initOpIndex,
    applyTx,
    applyOpIndex,
    1,
  );

  const intermediateCancelTb = transactionBuilder(
    noopAuthenticator,
    receipientConnection.client,
  );

  const { cancelTx, cancelOpIndex, cancelProof } = await intermediateCancelTb
    .add(applyProof)
    .add(cancelOperation)
    .buildAndSendWithAnchoring()
    .then(async (anchored) => {
      return {
        cancelTx: anchored.tx,
        cancelOpIndex: 1,
        cancelProof: await anchored.systemConfirmationProof(
          blockchainsPath[blockchainsPath.length - 1],
        ),
      };
    });

  // Force block building to get past deadline
  await createSession(intermediateConnection, noopAuthenticator)
    .transactionBuilder()
    .add(emptyOp(), { authenticator: noopAuthenticator })
    .add(nop(), { authenticator: noopAuthenticator })
    .buildAndSend();

  const unapplyOperation = unapplyTransfer(
    initTx,
    initOpIndex,
    cancelTx,
    cancelOpIndex,
    0,
  );

  const unapplyTb = transactionBuilder(
    noopAuthenticator,
    intermediateConnection.client,
  );

  await unapplyTb
    .add(cancelProof)
    .add(unapplyOperation)
    .buildAndSendWithAnchoring();
}

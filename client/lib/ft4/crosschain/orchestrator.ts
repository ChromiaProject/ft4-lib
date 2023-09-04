import { formatter } from "postchain-client";
import { BufferId } from "/cryptoUtils";
import { Amount } from "../asset/interfaces";
import { transactionBuilder } from "../utils/transaction-builder";
import { createConnectionToBrid } from "./pathfinder";
import { Listener, ftEventEmitter } from "../events";
import { OrchestratorError } from "./errors";
import {
  initTransfer as initTransferOp,
  applyTransfer as applyTransferOp,
} from "./operations";

type State = {
  current: number;
  path: BufferId[];
  tx?: any;
};

export function createOrchestrator(
  recipientId: BufferId,
  amount: Amount,
  assetId: BufferId,
  path: BufferId[],
  authenticator: any,
  connection: any,
) {
  const normalizedPath = path.map(formatter.ensureBuffer);

  const state: State = {
    current: 0,
    path: normalizedPath,
  };

  async function initTransfer(): Promise<void> {
    return new Promise((resolve) => {
      const tb = transactionBuilder(authenticator, connection.client);

      const tx = tb
        .add(
          initTransferOp(recipientId, assetId, amount, normalizedPath),
          () => {
            state.tx = tx;
            resolve();
          },
        )
        .build()
        .then((tx) => {
          state.tx = tx;
          connection.client.sendTransaction(tx);
        });
    });
  }

  function applyTransfer(targetChainBrid: BufferId): Promise<void> {
    return new Promise((resolve) => {
      const tb = transactionBuilder(authenticator, connection.client);
      const normalizedTargetChainBrid = formatter.ensureBuffer(targetChainBrid);

      tb.add(
        applyTransferOp(
          recipientId,
          assetId,
          amount,
          normalizedPath,
          state.tx,
          normalizedPath.indexOf(normalizedTargetChainBrid),
        ),
        () => {
          resolve();
        },
      )
        .build()
        .then((tx) => {
          state.tx = tx;
          return createConnectionToBrid(connection.client, targetChainBrid);
        })
        .then((connection) => {
          connection.client.sendTransaction(state.tx);
        });
    });
  }

  async function transfer() {
    try {
      for (
        let pathIndex = state.current;
        pathIndex < normalizedPath.length;
        pathIndex++
      ) {
        const brid = normalizedPath[pathIndex];

        if (pathIndex === 0) {
          ftEventEmitter.emit("TransferInit", brid);
          await initTransfer();
        } else {
          await applyTransfer(brid);
        }

        state.current++;
        ftEventEmitter.emit("TransferHop", brid);
      }

      ftEventEmitter.emit("TransferEnd");
    } catch (error) {
      const orchError = new OrchestratorError(error.message, "generalError");
      ftEventEmitter.emit("TransferError", orchError);
    }
  }

  /* Cross-Chain Transfer convenience event handlers */

  function onTransferInit(listener: Listener<[BufferId]>) {
    return ftEventEmitter.on("TransferInit", listener);
  }

  function offTransferInit(listener: Listener<[BufferId]>) {
    return ftEventEmitter.off("TransferInit", listener);
  }

  function onTransferHop(listener: Listener<[BufferId]>) {
    return ftEventEmitter.on("TransferHop", listener);
  }

  function offTransferHop(listener: Listener<[BufferId]>) {
    return ftEventEmitter.off("TransferHop", listener);
  }

  function onTransferEnd(listener: Listener<[]>) {
    return ftEventEmitter.on("TransferEnd", listener);
  }

  function offTransferEnd(listener: Listener<[]>) {
    return ftEventEmitter.off("TransferEnd", listener);
  }

  function onTransferError(listener: Listener<[OrchestratorError]>) {
    return ftEventEmitter.on("TransferError", listener);
  }

  function offTransferError(listener: Listener<[OrchestratorError]>) {
    return ftEventEmitter.off("TransferError", listener);
  }

  return {
    transfer,
    onTransferInit,
    offTransferInit,
    onTransferHop,
    offTransferHop,
    onTransferEnd,
    offTransferEnd,
    onTransferError,
    offTransferError,
  };
}

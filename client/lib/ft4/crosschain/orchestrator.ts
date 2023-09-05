import { formatter } from "postchain-client";
import { BufferId } from "/cryptoUtils";
import { Amount } from "../asset/interfaces";
import { createConnectionToBrid, findPathToChainForAsset } from "./pathfinder";
import { Listener, EventEmitter } from "../events";
import { OrchestratorError } from "./errors";
import {
  initTransfer as initTransferOp,
  applyTransfer as applyTransferOp,
} from "./operations";
import { Session } from "../types";

type State = {
  current: number;
  path: BufferId[];
  tx?: any;
};

export async function createOrchestrator(
  targetChainId: BufferId,
  recipientId: BufferId,
  amount: Amount,
  assetId: BufferId,
  session: Session,
) {
  const asset = await session.getAssetById(assetId);
  const path = await findPathToChainForAsset(session, asset, targetChainId);
  const normalizedPath = path.map(formatter.ensureBuffer);

  // Create a local event emitter instance for this orchestrator.
  const localEmitter = new EventEmitter();

  const state: State = {
    current: 0,
    path: normalizedPath,
  };

  function initTransfer(): Promise<void> {
    return new Promise((resolve) => {
      const tb = session.transactionBuilder();

      const tx = tb
        .add(
          initTransferOp(recipientId, assetId, amount, normalizedPath),
          () => {
            state.tx = tx;
            resolve();
          },
        )
        .buildAndSend()
        .then((tx) => {
          state.tx = tx;
        });
    });
  }

  function applyTransfer(targetChainBrid: Buffer): Promise<void> {
    return new Promise((resolve) => {
      const tb = session.transactionBuilder();

      tb.add(
        applyTransferOp(
          recipientId,
          assetId,
          amount,
          normalizedPath,
          state.tx,
          normalizedPath.indexOf(targetChainBrid),
        ),
        () => {
          resolve();
        },
      )
        .buildAndSend()
        .then((tx) => {
          state.tx = tx;
          return createConnectionToBrid(session.client, targetChainBrid);
        });
    });
  }

  async function transfer() {
    try {
      localEmitter.emit("TransferInit");
      await initTransfer();

      for (
        let pathIndex = state.current;
        pathIndex < normalizedPath.length;
        pathIndex++
      ) {
        const brid = normalizedPath[pathIndex];

        await applyTransfer(brid);

        state.current++;
        localEmitter.emit("TransferHop", brid);
      }

      localEmitter.emit("TransferEnd");
    } catch (error) {
      const orchError = new OrchestratorError(error.message, "generalError");
      localEmitter.emit("TransferError", orchError);
    }
  }

  /* Cross-Chain Transfer convenience event handlers */

  function onTransferInit(listener: Listener<[]>) {
    return localEmitter.on("TransferInit", listener);
  }

  function offTransferInit(listener: Listener<[]>) {
    return localEmitter.off("TransferInit", listener);
  }

  function onTransferHop(listener: Listener<[BufferId]>) {
    return localEmitter.on("TransferHop", listener);
  }

  function offTransferHop(listener: Listener<[BufferId]>) {
    return localEmitter.off("TransferHop", listener);
  }

  function onTransferEnd(listener: Listener<[]>) {
    return localEmitter.on("TransferEnd", listener);
  }

  function offTransferEnd(listener: Listener<[]>) {
    return localEmitter.off("TransferEnd", listener);
  }

  function onTransferError(listener: Listener<[OrchestratorError]>) {
    return localEmitter.on("TransferError", listener);
  }

  function offTransferError(listener: Listener<[OrchestratorError]>) {
    return localEmitter.off("TransferError", listener);
  }

  return {
    transfer,
    eventEmitter: localEmitter,
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

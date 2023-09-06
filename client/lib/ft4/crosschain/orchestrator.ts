import { SignedTransaction, formatter } from "postchain-client";
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
import { transactionBuilder } from "../utils/transaction-builder";
import { createAuthenticator } from "../authentication";

type State = {
  current: number;
  path: BufferId[];
  tx?: SignedTransaction;
};

/**
 * Creates an orchestrator instance for managing cross-chain transfers.
 *
 * @async
 * @param {BufferId} targetChainId - ID of the target blockchain.
 * @param {BufferId} recipientId - ID of the recipient.
 * @param {Amount} amount - The amount to be transferred.
 * @param {BufferId} assetId - ID of the asset to be transferred.
 * @param {Session} session - The current user session.
 * @returns {{
 *   transfer: Function,
 *   eventEmitter: EventEmitter,
 *   onTransferInit: Function,
 *   offTransferInit: Function,
 *   onTransferHop: Function,
 *   offTransferHop: Function,
 *   onTransferEnd: Function,
 *   offTransferEnd: Function,
 *   onTransferError: Function,
 *   offTransferError: Function
 * }} The orchestrator instance.
 * @property {Function} transfer - Initiates the transfer process.
 * @property {EventEmitter} eventEmitter - Local EventEmitter instance for this orchestrator.
 * @property {Function} onTransferInit - Subscribes to the 'TransferInit' event.
 * @property {Function} offTransferInit - Unsubscribes from the 'TransferInit' event.
 * @property {Function} onTransferHop - Subscribes to the 'TransferHop' event.
 * @property {Function} offTransferHop - Unsubscribes from the 'TransferHop' event.
 * @property {Function} onTransferEnd - Subscribes to the 'TransferEnd' event.
 * @property {Function} offTransferEnd - Unsubscribes from the 'TransferEnd' event.
 * @property {Function} onTransferError - Subscribes to the 'TransferError' event.
 * @property {Function} offTransferError - Unsubscribes from the 'TransferError' event.
 */
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

  /**
   * Initialize the transfer by creating the initial transaction.
   * @returns {Promise<void>}
   */
  function initTransfer(): Promise<void> {
    return new Promise((resolve) => {
      const tb = session.transactionBuilder();

      tb
        .add(
          initTransferOp(recipientId, assetId, amount, normalizedPath),
          () => resolve(),
        )
        .buildAndSend()
        .then(({ tx }) => {
          state.tx = tx;
        });
    });
  }

  /**
   * Apply the transfer operation targeting a specific bridge.
   * @param {Buffer} targetChainBrid - The ID of the target bridge.
   * @returns {Promise<void>}
   */
  function applyTransfer(targetChainBrid: Buffer): Promise<void> {
    return new Promise(async (resolve) => {

  // accountId: BufferId,
  // keyHandlers: KeyHandler[],
  // authDataService: AuthDataService

      const connection = await createConnectionToBrid(session.client, targetChainBrid);
      const tb = transactionBuilder(createAuthenticator(), connection.client);

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

  /**
   * Execute the transfer operation across all steps.
   * @async
   * @returns {Promise<void>}
   */
  async function transfer(): Promise<void> {
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

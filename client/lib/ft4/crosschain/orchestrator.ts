import { Buffer } from "buffer";
import {
  Operation,
  RawGtx,
  createClient,
  createIccfProofTx,
  formatter,
  gtv,
} from "postchain-client";
import { Amount } from "../asset/interfaces";
import { createNoopAuthenticator } from "../authentication";
import { createAuthDataService } from "../ft-session";
import { Session } from "../types";
import { getTransactionRid } from "../utils";
import { transactionBuilder } from "../utils/transaction-builder";
import { Listener, EventEmitter } from "../events";
import {
  ApplyTransferError,
  ErrorMessages,
  FactoryError,
  InitTransferError,
  OrchestratorError,
  TransferExecutionError,
} from "./errors";
import {
  applyTransfer as applyTransferOp,
  completeTransfer as completeTransferOp,
  initTransfer as initTransferOp,
} from "./operations";
import { createConnectionToBrid, findPathToChainForAsset } from "./pathfinder";
import { isTransferApplied } from "./queries";
import {
  ExternalOrchestratorBase,
  Orchestrator,
  OrchestratorBase,
  OrchestratorEvents,
  PendingTransfer,
  ResumeOrchestrator,
} from "./types";
import { BufferId } from "/cryptoUtils";
import { OnAnchoredHandlerData } from "../utils/transaction-builder/types";

/**
 * Creates an orchestrator instance for managing cross-chain transfers.
 * @async
 * @param {BufferId} targetChainId - ID of the target blockchain.
 * @param {BufferId} recipientId - ID of the recipient.
 * @param {BufferId} assetId - ID of the asset to be transferred.
 * @param {Amount} amount - The amount to be transferred.
 * @param {Session} session - The current user session.
 * @returns {Orchestrator} The orchestrator instance with functionalities like initiating transfers,
 * subscribing/unsubscribing to various transfer events.
 */
export async function createOrchestrator(
  targetChainId: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  session: Session,
): Promise<Orchestrator> {
  const asset = await session.getAssetById(assetId);
  if (!asset) {
    throw new FactoryError(ErrorMessages.ASSET_NOT_FOUND);
  }
  let path: Buffer[];

  try {
    path = await findPathToChainForAsset(session, asset, targetChainId);
  } catch (error) {
    throw new FactoryError(ErrorMessages.FAILED_TO_FIND_PATH, error);
  }

  const { state, ...orchestrator } = await createBaseOrcestrator(session, path);

  /**
   * Initialize the transfer by creating the initial transaction.
   * @returns {Promise<void>}
   */
  async function initTransfer(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tb = session.transactionBuilder();

      tb.add(
        initTransferOp(recipientId, assetId, amount, path),
        (data: OnAnchoredHandlerData | null, error: Error | null) => {
          if (error) {
            reject(
              new InitTransferError(ErrorMessages.UNABLE_TO_FETCH_PROOF, error),
            );
          } else {
            state.tx = data?.tx;
            state.initialTx = data?.tx;
            resolve();
          }
        },
      )
        .buildAndSend()
        .catch((reason) =>
          reject(
            new InitTransferError(
              ErrorMessages.FAILED_TO_SEND_TRANSACTION,
              reason,
            ),
          ),
        );
    }).then(() => {
      orchestrator.eventEmitter.emit("TransferInit");
    });
  }

  /**
   * Execute the transfer operation across all steps.
   * @async
   * @returns {Promise<void>}
   */
  async function transfer(): Promise<void> {
    await orchestrator.handleErrors(async () => {
      await initTransfer();

      if (!state.tx || !state.initialTx) {
        throw new OrchestratorError(
          "Unable to perform transfer as tx was not applied propperly",
        );
      }
      await orchestrator.walkPath();
      await orchestrator.completeTransfer(state.tx);
    });
  }

  return Object.freeze({
    ...getPublicOrchestratorBase({ state, ...orchestrator }),
    transfer,
  });
}

/**
 * Creates an orchestrator instance to handle resuming a transfer
 * which was initiated but did not complete propperly
 * @param {Session} session - The current user session
 * @param {PendingTransfer} pendingTransfer - The transfer to resume
 * @returns The orchestrator instance which will be able to resume the transfer
 */
export async function createResumeOrchestrator(
  session: Session,
  pendingTransfer: PendingTransfer,
): Promise<ResumeOrchestrator> {
  const operations = pendingTransfer.tx[0][1];
  const initTransferOpArgs = operations[pendingTransfer.opIndex][1];
  const path = initTransferOpArgs[3] as Buffer[];

  const { state, ...orchestrator } = await createBaseOrcestrator(session, path);

  /**
   * Accepts a cross chain transfer that was not completed
   * and resumes it. This function returns when the transfer
   * has been successfully completed.
   * @param transfer the transfer to resume
   */
  async function resumeTransfer(): Promise<void> {
    state.tx = pendingTransfer.tx;
    state.initialTx = pendingTransfer.tx;
    for (let i = 0; i < state.path.length; i++) {
      if (
        await isAppliedOnBrid(
          formatter.ensureBuffer(state.path[i]),
          getTransactionRid(state.tx),
          pendingTransfer.opIndex,
        )
      ) {
        state.currentHopIndex = i + 1;
        break;
      }
    }

    if (
      state.currentHopIndex > 0 &&
      state.currentHopIndex === state.path.length - 1
    ) {
      // Transfer already applied, make sure that pending transfer is also cleaned up
      await orchestrator.handleErrors(async () => {
        await orchestrator.completeTransfer(state.tx!, pendingTransfer);
      });
      return;
    }

    await orchestrator.handleErrors(async () => {
      await orchestrator.walkPath();
      await orchestrator.completeTransfer(state.tx!, pendingTransfer);
    });
  }

  /**
   * Checks to see wether the specified transfer is already applied to
   * this brid.
   * @param targetChainBrid the brid of the chain to check
   * @param txBrid the brid of the transaction containing the transfer
   * @param opIndex the index of the transfer in the transaction
   * @returns a promise that resolves to true if transfer is applied, otherwise resolves to false.
   */
  async function isAppliedOnBrid(
    targetChainBrid: Buffer,
    txBrid: Buffer,
    opIndex: number,
  ): Promise<boolean> {
    const connection = await createConnectionToBrid(
      session.client,
      targetChainBrid,
    );
    return connection.query(isTransferApplied(txBrid, opIndex));
  }

  return Object.freeze({
    ...getPublicOrchestratorBase({ state, ...orchestrator }),
    resumeTransfer,
  });
}

async function createBaseOrcestrator(
  session: Session,
  path: Buffer[],
): Promise<OrchestratorBase> {
  const state = {
    currentHopIndex: 0,
    path,
    tx: undefined,
    initialTx: undefined,
  };

  const directoryClient = await createClient({
    directoryNodeUrlPool: session.client.config.endpointPool.slice(),
    blockchainIid: 0,
  });

  // Create a local event emitter instance for this orchestrator.
  const localEmitter = new EventEmitter<OrchestratorEvents>();

  /**
   * Apply the transfer operation targeting a specific bridge.
   * @param {RawGtx} initTransferTx - The tx that was used to initialize the transfer
   * @param {Buffer} targetChainBrid - The ID of the target bridge.
   * @returns {Promise<void>}
   */
  async function applyTransfer(
    initTransferTx: RawGtx,
    targetChainBrid: Buffer,
  ): Promise<void> {
    if (!state.tx) {
      throw new OrchestratorError(
        "Unable to apply transfer for non existing transaction",
      );
    }
    const tb = await getTransactionBuilderForChain(session, targetChainBrid);

    const iccfOp = await createIccfProofOperation(
      targetChainBrid,
      path.indexOf(targetChainBrid),
    );

    return new Promise<void>((resolve, reject) => {
      tb.add(iccfOp)
        .add(
          applyTransferOp(
            initTransferTx,
            state.tx!,
            path.indexOf(targetChainBrid),
          ),
          (data: OnAnchoredHandlerData | null, error: Error | null) => {
            if (error) {
              reject(
                new ApplyTransferError(
                  ErrorMessages.UNABLE_TO_FETCH_PROOF,
                  error,
                ),
              );
              return;
            }
            state.tx = data?.tx;
            resolve();
          },
        )
        .buildAndSend()
        .catch((error) =>
          reject(
            new ApplyTransferError(
              ErrorMessages.FAILED_TO_SEND_TRANSACTION,
              error,
            ),
          ),
        );
    }).then(() => {
      localEmitter.emit("TransferHop", targetChainBrid);
    });
  }

  async function walkPath() {
    for (
      let hopIndex = state.currentHopIndex;
      hopIndex < path.length;
      hopIndex++
    ) {
      const nextBrid = path[hopIndex];
      await applyTransfer(state.initialTx, nextBrid);

      state.currentHopIndex++;
    }
  }

  async function getTransactionBuilderForChain(session: Session, brid: Buffer) {
    const connection = await createConnectionToBrid(session.client, brid);
    const authDataService = createAuthDataService(connection);
    const noopAuthenticator = createNoopAuthenticator(authDataService);
    return transactionBuilder(noopAuthenticator, connection.client);
  }

  /**
   * Create ICCF proof for a specific bridge.
   *
   * @param {Buffer} targetChainBrid - The ID of the target bridge.
   * @param {number} hopIndex - the hop index of the path where the transaction is anchored
   * @returns {Promise<Operation>} The ICCF proof operation.
   */
  async function createIccfProofOperation(
    targetChainBrid: Buffer,
    hopIndex: number,
  ): Promise<Operation> {
    if (!state.tx) {
      throw new OrchestratorError(
        "Unable to create a proof operation for a non existing transaction",
      );
    }

    const sourceBlockchainRid =
      hopIndex === 0 ? session.client.config.blockchainRid : path[hopIndex - 1];

    const proofTx = await createIccfProofTx(
      directoryClient,
      getTransactionRid(state.tx),
      gtv.gtvHash(state.tx),
      state.tx[0][2], // signers
      sourceBlockchainRid.toString("hex"),
      targetChainBrid.toString("hex"),
    );

    return proofTx.iccfTx.operations[0];
  }

  /**
   * Wraps the provied callback in a try/catch block and handles
   * emitting error events if the provided callback throws any errors.
   * @param fn
   */
  async function handleErrors(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (error) {
      let orchError: TransferExecutionError;

      if (error instanceof TransferExecutionError) {
        orchError = error;
      } else {
        const errorMessage = error.message ? error.message : error.toString();
        orchError = new TransferExecutionError(errorMessage, error);
      }

      localEmitter.emit("TransferError", orchError);
    }
  }

  async function completeTransfer(tx: RawGtx, transfer?: PendingTransfer) {
    const targetChainBrid = path.slice(-1)[0];
    const tb = await getTransactionBuilderForChain(
      session,
      Buffer.from(session.client.config.blockchainRid, "hex"),
    );

    const iccfOp = await createIccfProofOperation(targetChainBrid, path.length);

    await new Promise<void>((resolve) => {
      tb.add(iccfOp)
        .add(completeTransferOp(tx, transfer?.opIndex || 1), () => {
          resolve();
        })
        .buildAndSend();
    });

    localEmitter.emit("TransferComplete");
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

  function onTransferComplete(listener: Listener<[]>) {
    return localEmitter.on("TransferComplete", listener);
  }

  function offTransferComplete(listener: Listener<[]>) {
    return localEmitter.off("TransferComplete", listener);
  }

  function onTransferError(listener: Listener<[OrchestratorError]>) {
    return localEmitter.on("TransferError", listener);
  }

  function offTransferError(listener: Listener<[OrchestratorError]>) {
    return localEmitter.off("TransferError", listener);
  }

  return Object.freeze({
    state,
    eventEmitter: localEmitter,
    walkPath,
    getTransactionBuilderForChain,
    handleErrors,
    completeTransfer,
    createIccfProofOperation,
    onTransferInit,
    offTransferInit,
    onTransferHop,
    offTransferHop,
    onTransferComplete,
    offTransferComplete,
    onTransferError,
    offTransferError,
  });
}

function getPublicOrchestratorBase(
  orchestrator: OrchestratorBase,
): ExternalOrchestratorBase {
  const {
    eventEmitter,
    onTransferInit,
    offTransferInit,
    onTransferHop,
    offTransferHop,
    onTransferComplete,
    offTransferComplete,
    onTransferError,
    offTransferError,
  } = orchestrator;

  return Object.freeze({
    eventEmitter,
    onTransferInit,
    offTransferInit,
    onTransferHop,
    offTransferHop,
    onTransferComplete,
    offTransferComplete,
    onTransferError,
    offTransferError,
  });
}

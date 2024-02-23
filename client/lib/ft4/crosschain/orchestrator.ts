import { Amount } from "@ft4/asset";
import { EventEmitter, Listener } from "@ft4/events";
import { Session } from "@ft4/index";
import {
  BufferId,
  OnAnchoredHandlerData,
  getTransactionRid,
  nop,
} from "@ft4/utils";
import { transactionBuilder } from "@ft4/utils/transaction-builder";
import { Buffer } from "buffer";
import {
  Operation,
  RawGtx,
  createClient,
  createIccfProofTx,
  formatter,
  gtv,
} from "postchain-client";
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
import {
  createConnectionToBlockchainRid,
  findPathToChainForAsset,
} from "./pathfinder";
import { isTransferApplied } from "./queries";
import {
  ExternalOrchestratorBase,
  Orchestrator,
  OrchestratorBase,
  OrchestratorEvents,
  OrchestratorState,
  PendingTransfer,
  ResumeOrchestrator,
} from "./types";

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

  const { state, ...orchestrator } = await createBaseOrchestrator(
    session,
    path,
  );

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
        .add(nop())
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
          "Unable to perform transfer as tx was not applied properly",
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

  const { state, ...orchestrator } = await createBaseOrchestrator(
    session,
    path,
  );

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
        await isAppliedOnBlockchainRid(
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
   * this blockchainRid.
   * @param targetChainRid the blockchain rid of the chain to check
   * @param txBlockchainRid the blockchain rid of the transaction containing the transfer
   * @param opIndex the index of the transfer in the transaction
   * @returns a promise that resolves to true if transfer is applied, otherwise resolves to false.
   */
  async function isAppliedOnBlockchainRid(
    targetChainRid: Buffer,
    txBlockchainRid: Buffer,
    opIndex: number,
  ): Promise<boolean> {
    const connection = await createConnectionToBlockchainRid(
      session.client,
      targetChainRid,
    );
    return connection.query(isTransferApplied(txBlockchainRid, opIndex));
  }

  return Object.freeze({
    ...getPublicOrchestratorBase({ state, ...orchestrator }),
    resumeTransfer,
  });
}

async function createBaseOrchestrator(
  session: Session,
  path: Buffer[],
): Promise<OrchestratorBase> {
  const state: OrchestratorState = {
    currentHopIndex: 0,
    path,
    tx: undefined,
    initialTx: undefined,
  };

  const directoryClient = await createClient({
    nodeUrlPool: session.client.config.endpointPool.slice().map((ep) => ep.url),
    blockchainIid: 0,
  });

  // Create a local event emitter instance for this orchestrator.
  const localEmitter = new EventEmitter<OrchestratorEvents>();

  /**
   * Apply the transfer operation targeting a specific blockchain.
   * @param {RawGtx} initTransferTx - The tx that was used to initialize the transfer
   * @param {Buffer} targetChainRid - The ID of the target blockchain.
   * @returns {Promise<void>}
   */
  async function applyTransfer(
    initTransferTx: RawGtx,
    targetChainRid: Buffer,
  ): Promise<void> {
    if (!state.tx) {
      throw new OrchestratorError(
        "Unable to apply transfer for non existing transaction",
      );
    }

    const iccfOp = await createIccfProofOperation(
      targetChainRid,
      path.indexOf(targetChainRid),
    );

    // eslint-disable-next-line no-async-promise-executor
    return new Promise<void>(async (resolve, reject) => {
      let completed = false;
      for (let i = 0; i < 20; ++i) {
        if (completed) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          await (
            await getTransactionBuilderForChain(session, targetChainRid)
          )
            .add(iccfOp)
            .add(
              applyTransferOp(
                initTransferTx,
                state.tx!,
                path.indexOf(targetChainRid),
                1,
                path.indexOf(targetChainRid) === 0 ? 1 : 3,
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
                completed = true;
              },
            )
            .buildAndSend();
        } catch {
          /* Error is sometimes expected here */
        }
      }
      if (completed) {
        resolve();
      } else {
        reject("Unable to apply transfer within the specified timeout");
      }
    }).then(() => {
      localEmitter.emit("TransferHop", targetChainRid);
    });
  }

  async function walkPath() {
    if (!state.initialTx) {
      throw new OrchestratorError(
        "Unable to perform transfer as no initial tx supplied",
      );
    }
    for (
      let hopIndex = state.currentHopIndex;
      hopIndex < path.length;
      hopIndex++
    ) {
      const nextBlockchainRid = path[hopIndex];
      await applyTransfer(state.initialTx, nextBlockchainRid);

      state.currentHopIndex++;
    }
  }

  async function getTransactionBuilderForChain(
    session: Session,
    blockchainRid: Buffer,
  ) {
    const connection = await createConnectionToBlockchainRid(
      session.client,
      blockchainRid,
    );
    return transactionBuilder(session.account.authenticator, connection.client);
  }

  /**
   * Create ICCF proof for a specific blockchain.
   *
   * @param {Buffer} targetChainRid - The ID of the target blockchain.
   * @param {number} hopIndex - the hop index of the path where the transaction is anchored
   * @returns {Promise<Operation>} The ICCF proof operation.
   */
  async function createIccfProofOperation(
    targetChainRid: Buffer,
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
      targetChainRid.toString("hex"),
      state.tx[0][2], // signers,
      true,
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
    const targetChainRid = path.slice(-1)[0];

    const iccfOp = await createIccfProofOperation(targetChainRid, path.length);
    const tb = await getTransactionBuilderForChain(
      session,
      Buffer.from(session.client.config.blockchainRid, "hex"),
    );
    await tb
      .add(iccfOp)
      .add(completeTransferOp(tx, transfer?.opIndex ?? 3))
      .buildAndSend();

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

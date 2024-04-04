import { Amount } from "@ft4/asset";
import { Authenticator, SigningError, days } from "@ft4/authentication";
import { EventEmitter, Listener } from "@ft4/events";
import { Connection, createConnectionToBlockchainRid } from "@ft4/ft-session";
import {
  OnAnchoredHandlerData,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { BufferId, getTransactionRid, nop } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  Operation,
  RawGtx,
  SignedTransaction,
  TransactionReceipt,
  createClient,
  createIccfProofTx,
  formatter,
  gtv,
} from "postchain-client";
import {
  ApplyTransferError,
  FactoryError,
  InitTransferError,
  OrchestratorError,
} from "./errors";
import { applyTransfer, completeTransfer, initTransfer } from "./operations";
import { findPathToChainForAsset } from "./pathfinder";
import { applyTransferTx, isTransferApplied } from "./queries";
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
 * @param {Connection} connection - The connection.
 * @param {Authenticator} authenticator - The authenticator.
 * @param {BufferId} targetChainId - ID of the target blockchain.
 * @param {BufferId} recipientId - ID of the recipient.
 * @param {BufferId} assetId - ID of the asset to be transferred.
 * @param {Amount} amount - The amount to be transferred.
 * @param {number} ttl - The number of milliseconds after which the transaction can only be reverted.
 * @returns {Orchestrator} The orchestrator instance with functionalities like initiating transfers,
 * subscribing/unsubscribing to various transfer events.
 */
export async function createOrchestrator(
  connection: Connection,
  authenticator: Authenticator,
  targetChainId: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  ttl: number = days(1),
): Promise<Orchestrator> {
  const asset = await connection.getAssetById(assetId);
  if (!asset) {
    throw new FactoryError("The specified asset could not be found");
  }

  const path = await findPathToChainForAsset(connection, asset, targetChainId);

  const { state, ...orchestrator } = await createBaseOrchestrator(
    connection,
    authenticator,
    path,
  );

  /**
   * Initialize the transfer by creating the initial transaction.
   * @returns {Promise<void>}
   */
  function performInitTransfer(): Promise<void> {
    return transactionBuilder(authenticator, connection.client)
      .addWithAnchoring(
        initTransfer(recipientId, assetId, amount, path, Date.now() + ttl),
        path[0],
        (data: OnAnchoredHandlerData | null, error: Error | null) => {
          if (error) {
            throw new InitTransferError(
              `Unable to fetch proof: ${error.message}`,
              error,
            );
          } else {
            state.tx = data?.tx;
            state.initialOpIndex = data?.opIndex;
            state.initialTx = data?.tx;
            state.opIndex = data?.opIndex;
          }
        },
      )
      .add(nop())
      .buildAndSendWithAnchoring()
      .on("built", (tx) => {
        orchestrator.eventEmitter.emit("TransferSigned", tx);
      })
      .then(({ tx: _tx, receipt }) => {
        orchestrator.eventEmitter.emit("TransferInit", receipt);
      })
      .catch((reason: Error) => {
        if (reason instanceof SigningError) {
          throw reason;
        } else {
          throw new InitTransferError(
            `Failed to send transaction: ${reason.message}`,
            reason,
          );
        }
      });
  }

  /**
   * Execute the transfer operation across all steps.
   * @async
   * @returns {Promise<void>}
   */
  async function transfer(): Promise<void> {
    await performInitTransfer();

    if (state.tx === undefined || state.opIndex === undefined) {
      throw new OrchestratorError(
        "Unable to perform transfer as tx was not applied properly",
      );
    }
    await orchestrator.walkPath();
    await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
  }

  return Object.freeze({
    ...getPublicOrchestratorBase({ state, ...orchestrator }),
    transfer,
  });
}

/**
 * Creates an orchestrator instance to handle resuming a transfer
 * which was initiated but did not complete properly
 * @param {Connection} connection - The connection.
 * @param {Authenticator} authenticator - The authenticator.
 * @param {PendingTransfer} pendingTransfer - The transfer to resume
 * @returns The orchestrator instance which will be able to resume the transfer
 */
export async function createResumeOrchestrator(
  connection: Connection,
  authenticator: Authenticator,
  pendingTransfer: PendingTransfer,
): Promise<ResumeOrchestrator> {
  const operations = pendingTransfer.tx[0][1];
  const initTransferOpArgs = operations[pendingTransfer.opIndex][1];
  const path = initTransferOpArgs[3] as Buffer[];

  const { state, ...orchestrator } = await createBaseOrchestrator(
    connection,
    authenticator,
    path,
  );

  /**
   * Accepts a cross chain transfer that was not completed
   * and resumes it. This function returns when the transfer
   * has been successfully completed.
   */
  async function resumeTransfer(): Promise<void> {
    state.tx = pendingTransfer.tx;
    state.opIndex = pendingTransfer.opIndex;
    state.initialTx = pendingTransfer.tx;
    state.initialOpIndex = pendingTransfer.opIndex;
    let currentHopIndex: number | undefined = undefined;
    for (let i = 0; i < state.path.length; i++) {
      if (
        !(await isAppliedOnBlockchainRid(
          formatter.ensureBuffer(state.path[i]),
          getTransactionRid(state.tx),
          state.opIndex,
        ))
      ) {
        break;
      }
      currentHopIndex = i;
    }

    if (
      state.currentHopIndex > 0 &&
      state.currentHopIndex === state.path.length - 1
    ) {
      // Transfer already applied, make sure that pending transfer is also cleaned up
      await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
      return;
    }

    if (currentHopIndex !== undefined) {
      const res = await getAppliedTx(
        getTransactionRid(state.tx),
        state.path[currentHopIndex],
        state.opIndex,
      );
      state.tx = res.tx;
      state.opIndex = res.opIndex;
      state.currentHopIndex = currentHopIndex + 1;
    } else {
      state.currentHopIndex = 0;
    }

    await orchestrator.walkPath();
    await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
  }

  async function getAppliedTx(
    tx_rid: Buffer,
    targetChainRid: Buffer,
    opIndex: number,
  ) {
    const newConnection = await createConnectionToBlockchainRid(
      connection,
      targetChainRid,
    );
    return newConnection
      .query(applyTransferTx(tx_rid, opIndex))
      .then((res) => ({ tx: res.tx, opIndex: res.op_index }));
  }

  /**
   * Checks to see whether the specified transfer is already applied to
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
    const newConnection = await createConnectionToBlockchainRid(
      connection,
      targetChainRid,
    );
    return newConnection.query(isTransferApplied(txBlockchainRid, opIndex));
  }

  return Object.freeze({
    ...getPublicOrchestratorBase({ state, ...orchestrator }),
    resumeTransfer,
  });
}

async function createBaseOrchestrator(
  connection: Connection,
  authenticator: Authenticator,
  path: Buffer[],
): Promise<OrchestratorBase> {
  const state: OrchestratorState = {
    currentHopIndex: 0,
    path,
    tx: undefined,
    initialTx: undefined,
  };

  const directoryClient = await createClient({
    nodeUrlPool: connection.client.config.endpointPool.map((ep) => ep.url),
    blockchainIid: 0,
  });

  // Create a local event emitter instance for this orchestrator.
  const localEmitter = new EventEmitter<OrchestratorEvents>();

  /**
   * Apply the transfer operation targeting a specific blockchain.
   * @param {RawGtx} initTransferTx - The tx that was used to initialize the transfer
   * @param {number} initTransferOpIndex - Op index of `initTransferTx`
   * @param {Buffer} targetChainRid - The ID of the target blockchain.
   * @returns {Promise<void>}
   */
  async function performApplyTransfer(
    initTransferTx: RawGtx,
    initTransferOpIndex: number,
    targetChainRid: Buffer,
  ): Promise<void> {
    if (state.tx === undefined) {
      throw new OrchestratorError(
        "Unable to apply transfer for non existing transaction",
      );
    }

    const hopIndex = path.findIndex((brid) => brid.equals(targetChainRid));

    const iccfOp = await createIccfProofOperation(targetChainRid, hopIndex);

    const tb = await getTransactionBuilderForChain(
      connection,
      authenticator,
      targetChainRid,
    );

    const anchoringTargetChain =
      hopIndex + 1 > path.length - 1
        ? connection.blockchainRid
        : path[hopIndex + 1];

    try {
      await tb
        .addWithoutAuthenticator(iccfOp)
        .addWithAnchoringWithoutAuthenticator(
          applyTransfer(
            initTransferTx,
            initTransferOpIndex,
            state.tx!,
            state.opIndex!,
            hopIndex,
          ),
          anchoringTargetChain,
          (data: OnAnchoredHandlerData | null, error: Error | null) => {
            if (error) {
              throw new ApplyTransferError(
                `Unable to fetch proof: ${error.message}`,
                error,
              );
            }
            state.tx = data?.tx;
            state.opIndex = data?.opIndex;
          },
        )
        .buildAndSendWithAnchoring();
      localEmitter.emit("TransferHop", targetChainRid);
    } catch (error) {
      throw new ApplyTransferError("Unable to apply transfer", error);
    }
  }

  async function walkPath() {
    if (state.initialTx === undefined || state.initialOpIndex === undefined) {
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
      await performApplyTransfer(
        state.initialTx,
        state.initialOpIndex,
        nextBlockchainRid,
      );

      state.currentHopIndex++;
    }
  }

  async function getTransactionBuilderForChain(
    connection: Connection,
    authenticator: Authenticator,
    blockchainRid: Buffer,
  ) {
    const newConnection = await createConnectionToBlockchainRid(
      connection,
      blockchainRid,
    );
    return transactionBuilder(authenticator, newConnection.client);
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
    if (state.tx === undefined) {
      throw new OrchestratorError(
        "Unable to create a proof operation for a non existing transaction",
      );
    }

    const sourceBlockchainRid =
      hopIndex === 0
        ? connection.client.config.blockchainRid
        : path[hopIndex - 1];

    const proofTx = await createIccfProofTx(
      directoryClient,
      getTransactionRid(state.tx),
      gtv.gtvHash(state.tx),
      state.tx[0][2], // signers
      sourceBlockchainRid.toString("hex"),
      targetChainRid.toString("hex"),
      undefined,
      true,
    );

    return proofTx.iccfTx.operations[0];
  }

  async function performCompleteTransfer(tx: RawGtx, opIndex: number) {
    const targetChainRid = path.slice(-1)[0];

    const iccfOp = await createIccfProofOperation(targetChainRid, path.length);
    const tb = await getTransactionBuilderForChain(
      connection,
      authenticator,
      Buffer.from(connection.client.config.blockchainRid, "hex"),
    );
    await tb
      .addWithoutAuthenticator(iccfOp)
      .addWithoutAuthenticator(completeTransfer(tx, opIndex))
      .buildAndSend();
  }

  /* Cross-Chain Transfer convenience event handlers */

  function onTransferInit(listener: Listener<[TransactionReceipt]>) {
    return localEmitter.on("TransferInit", listener);
  }

  function offTransferInit(listener: Listener<[TransactionReceipt]>) {
    return localEmitter.off("TransferInit", listener);
  }

  function onTransferSigned(listener: Listener<[SignedTransaction]>) {
    return localEmitter.on("TransferSigned", listener);
  }

  function offTransferSigned(listener: Listener<[SignedTransaction]>) {
    return localEmitter.off("TransferSigned", listener);
  }

  function onTransferHop(listener: Listener<[BufferId]>) {
    return localEmitter.on("TransferHop", listener);
  }

  function offTransferHop(listener: Listener<[BufferId]>) {
    return localEmitter.off("TransferHop", listener);
  }

  return Object.freeze({
    state,
    eventEmitter: localEmitter,
    walkPath,
    getTransactionBuilderForChain,
    performCompleteTransfer,
    createIccfProofOperation,
    onTransferInit,
    offTransferInit,
    onTransferSigned,
    offTransferSigned,
    onTransferHop,
    offTransferHop,
  });
}

function getPublicOrchestratorBase(
  orchestrator: OrchestratorBase,
): ExternalOrchestratorBase {
  const {
    eventEmitter,
    onTransferInit,
    offTransferInit,
    onTransferSigned,
    offTransferSigned,
    onTransferHop,
    offTransferHop,
  } = orchestrator;

  return Object.freeze({
    eventEmitter,
    onTransferInit,
    offTransferInit,
    onTransferSigned,
    offTransferSigned,
    onTransferHop,
    offTransferHop,
  });
}

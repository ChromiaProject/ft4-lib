import { Amount } from "@ft4/asset";
import {
  Authenticator,
  SigningError,
  noopAuthenticator,
  days,
} from "@ft4/authentication";
import { EventEmitter, Listener } from "@ft4/events";
import { Connection, createConnectionToBlockchainRid } from "@ft4/ft-session";
import {
  OnAnchoredHandlerData,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { BufferId, getTransactionRid, nop } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  IClient,
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
import {
  applyTransfer,
  completeTransfer,
  initTransfer,
  cancelTransfer,
  unapplyTransfer,
  revertTransfer as revertTransferOp,
  recallUnclaimedTransfer as reclaimUnclaimedTransferOp,
} from "./operations";
import { findPathToChainForAsset } from "./pathfinder";
import { applyTransferTx, isTransferApplied } from "./queries";
import {
  ExternalOrchestratorBase,
  Orchestrator,
  OrchestratorBase,
  OrchestratorEvents,
  OrchestratorState,
  TransferRef,
  ResumeOrchestrator,
  RevertOrchestrator,
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
   */
  function performInitTransfer(): Promise<TransferRef> {
    return transactionBuilder(authenticator, connection.client)
      .add(initTransfer(recipientId, assetId, amount, path, Date.now() + ttl), {
        targetBlockchainRid: path[0],
        onAnchoredHandler: (
          data: OnAnchoredHandlerData | null,
          error: Error | null,
        ) => {
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
      })
      .add(nop())
      .buildAndSendWithAnchoring()
      .on("built", (tx) => {
        orchestrator.eventEmitter.emit("TransferSigned", tx);
      })
      .then(({ tx: _tx, receipt }) => {
        orchestrator.eventEmitter.emit("TransferInit", receipt);
        return { tx: state.tx!, opIndex: state.opIndex! };
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
   */
  async function transfer(): Promise<TransferRef> {
    const transferRef = await performInitTransfer();

    if (state.tx === undefined || state.opIndex === undefined) {
      throw new OrchestratorError(
        "Unable to perform transfer as tx was not applied properly",
      );
    }
    await orchestrator.walkPath();
    await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
    return transferRef;
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
 * @param {TransferRef} pendingTransfer - The transfer to resume
 * @returns The orchestrator instance which will be able to resume the transfer
 */
export async function createResumeOrchestrator(
  connection: Connection,
  authenticator: Authenticator,
  pendingTransfer: TransferRef,
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
          connection,
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
        connection,
        state.path[currentHopIndex],
        getTransactionRid(state.tx),
        state.opIndex,
      );
      state.tx = res.tx;
      state.opIndex = res.op_index;
      state.currentHopIndex = currentHopIndex + 1;
    } else {
      state.currentHopIndex = 0;
    }

    await orchestrator.walkPath();
    await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
  }

  return Object.freeze({
    ...getPublicOrchestratorBase({ state, ...orchestrator }),
    resumeTransfer,
  });
}

export async function createRevertOrchestrator(
  connection: Connection,
  authenticator: Authenticator,
  pendingTransfer: TransferRef,
): Promise<RevertOrchestrator> {
  const operations = pendingTransfer.tx[0][1];
  const initTransferOpArgs = operations[pendingTransfer.opIndex][1];
  const path = initTransferOpArgs[3] as Buffer[];

  const directoryClient = await createClient({
    nodeUrlPool: connection.client.config.endpointPool.map((ep) => ep.url),
    blockchainIid: 0,
  });

  const { state, ...orchestrator } = await createBaseOrchestrator(
    connection,
    authenticator,
    path,
  );

  async function revertTransfer(): Promise<void> {
    let firstNotAppliedHopIndex: number | undefined = undefined;
    for (let i = 0; i < path.length; i++) {
      if (
        !(await isAppliedOnBlockchainRid(
          connection,
          formatter.ensureBuffer(path[i]),
          getTransactionRid(pendingTransfer.tx),
          pendingTransfer.opIndex,
        ))
      ) {
        firstNotAppliedHopIndex = i;
        break;
      }
    }

    if (firstNotAppliedHopIndex === undefined) {
      throw new OrchestratorError("Transfer is already applied, cannot revert");
    }

    let sourceBlockchainRid: Buffer;
    let tx: RawGtx;
    let opIndex: number;

    if (firstNotAppliedHopIndex > 0) {
      sourceBlockchainRid = path[firstNotAppliedHopIndex - 1];
      const res = await getAppliedTx(
        connection,
        sourceBlockchainRid,
        getTransactionRid(pendingTransfer.tx),
        pendingTransfer.opIndex,
      );
      tx = res.tx;
      opIndex = res.op_index;
    } else {
      // use init_transfer
      sourceBlockchainRid = formatter.toBuffer(
        connection.client.config.blockchainRid,
      );
      tx = pendingTransfer.tx;
      opIndex = pendingTransfer.opIndex;
    }

    const targetBlockchainRid = path[firstNotAppliedHopIndex];

    const iccfOp = (
      await createIccfProofTx(
        directoryClient,
        getTransactionRid(tx),
        gtv.gtvHash(tx),
        tx[0][2], // signers
        formatter.toString(sourceBlockchainRid),
        formatter.toString(targetBlockchainRid),
        undefined,
        true,
      )
    ).iccfTx.operations[0];

    const tb = await getTransactionBuilderForChain(
      connection,
      authenticator,
      targetBlockchainRid,
    );

    await tb
      .add(iccfOp, { authenticator: noopAuthenticator })
      .add(
        cancelTransfer(
          pendingTransfer.tx,
          pendingTransfer.opIndex,
          tx,
          opIndex,
          firstNotAppliedHopIndex,
        ),
        {
          authenticator: noopAuthenticator,
          targetBlockchainRid:
            firstNotAppliedHopIndex > 0
              ? path[firstNotAppliedHopIndex - 1]
              : connection.blockchainRid,
          onAnchoredHandler: (
            data: OnAnchoredHandlerData | null,
            error: Error | null,
          ) => {
            if (error) {
              throw new OrchestratorError(
                `Unable to fetch proof: ${error.message}`,
                error,
              );
            }
            tx = data!.tx;
            opIndex = data!.opIndex;
          },
        },
      )
      .buildAndSendWithAnchoring();
    orchestrator.eventEmitter.emit("TransferHop", targetBlockchainRid);

    sourceBlockchainRid = targetBlockchainRid;
    await doRevert(firstNotAppliedHopIndex, sourceBlockchainRid, tx, opIndex);
  }

  async function recallUnclaimedTransfer(): Promise<void> {
    let tx: RawGtx;
    let opIndex: number;

    const targetBlockchainRid = path[path.length - 1];

    const tb = await getTransactionBuilderForChain(
      connection,
      authenticator,
      targetBlockchainRid,
    );

    await tb
      .add(
        reclaimUnclaimedTransferOp(pendingTransfer.tx, pendingTransfer.opIndex),
        {
          authenticator: noopAuthenticator,
          targetBlockchainRid,
          onAnchoredHandler: (
            data: OnAnchoredHandlerData | null,
            error: Error | null,
          ) => {
            if (error) {
              throw new OrchestratorError(
                `Unable to fetch proof: ${error.message}`,
                error,
              );
            }
            tx = data!.tx;
            opIndex = data!.opIndex;
          },
        },
      )
      .buildAndSendWithAnchoring();
    orchestrator.eventEmitter.emit("TransferHop", targetBlockchainRid);

    // @ts-expect-error `tx` and `opIndex` are assigned in async callback
    await doRevert(path.length - 1, targetBlockchainRid, tx, opIndex);
  }

  async function doRevert(
    firstNotAppliedHopIndex: number,
    sourceBlockchainRid: Buffer,
    tx: RawGtx,
    opIndex: number,
  ): Promise<void> {
    for (let hop = firstNotAppliedHopIndex - 1; hop >= 0; hop--) {
      const targetBlockchainRid = path[hop];

      const iccfOp = (
        await createIccfProofTx(
          directoryClient,
          getTransactionRid(tx),
          gtv.gtvHash(tx),
          tx[0][2], // signers
          formatter.toString(sourceBlockchainRid),
          formatter.toString(targetBlockchainRid),
          undefined,
          true,
        )
      ).iccfTx.operations[0];

      const tb = await getTransactionBuilderForChain(
        connection,
        authenticator,
        targetBlockchainRid,
      );

      await tb
        .add(iccfOp, { authenticator: noopAuthenticator })
        .add(
          unapplyTransfer(
            pendingTransfer.tx,
            pendingTransfer.opIndex,
            tx,
            opIndex,
            hop,
          ),
          {
            authenticator: noopAuthenticator,
            targetBlockchainRid:
              hop > 0 ? path[hop - 1] : connection.blockchainRid,
            onAnchoredHandler: (
              data: OnAnchoredHandlerData | null,
              error: Error | null,
            ) => {
              if (error) {
                throw new OrchestratorError(
                  `Unable to fetch proof: ${error.message}`,
                  error,
                );
              }
              tx = data!.tx;
              opIndex = data!.opIndex;
            },
          },
        )
        .buildAndSendWithAnchoring();
      orchestrator.eventEmitter.emit("TransferHop", targetBlockchainRid);

      sourceBlockchainRid = targetBlockchainRid;
    }

    const finalIccfOp = (
      await createIccfProofTx(
        directoryClient,
        getTransactionRid(tx),
        gtv.gtvHash(tx),
        tx[0][2], // signers
        formatter.toString(sourceBlockchainRid),
        formatter.toString(connection.blockchainRid),
        undefined,
        true,
      )
    ).iccfTx.operations[0];

    await transactionBuilder(authenticator, connection.client)
      .add(finalIccfOp, { authenticator: noopAuthenticator })
      .add(
        revertTransferOp(
          pendingTransfer.tx,
          pendingTransfer.opIndex,
          tx,
          opIndex,
        ),
        { authenticator: noopAuthenticator },
      )
      .buildAndSend();
  }

  return Object.freeze({
    ...getPublicOrchestratorBase({ state, ...orchestrator }),
    revertTransfer,
    recallUnclaimedTransfer,
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
   * @param {number} hopIndex hop index
   * @returns {Promise<void>}
   */
  async function performApplyTransfer(
    initTransferTx: RawGtx,
    initTransferOpIndex: number,
    targetChainRid: Buffer,
    hopIndex: number,
  ): Promise<void> {
    if (state.tx === undefined) {
      throw new OrchestratorError(
        "Unable to apply transfer for non existing transaction",
      );
    }

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
        .add(iccfOp, { authenticator: noopAuthenticator })
        .add(
          applyTransfer(
            initTransferTx,
            initTransferOpIndex,
            state.tx!,
            state.opIndex!,
            hopIndex,
          ),
          {
            authenticator: noopAuthenticator,
            targetBlockchainRid: anchoringTargetChain,
            onAnchoredHandler: (
              data: OnAnchoredHandlerData | null,
              error: Error | null,
            ) => {
              if (error) {
                throw new ApplyTransferError(
                  `Unable to fetch proof: ${error.message}`,
                  error,
                );
              }
              state.tx = data?.tx;
              state.opIndex = data?.opIndex;
            },
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
        hopIndex,
      );

      state.currentHopIndex++;
    }
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
    return await createIccfProofOp(
      directoryClient,
      connection,
      path,
      hopIndex,
      state.tx,
      targetChainRid,
    );
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
      .add(iccfOp, { authenticator: noopAuthenticator })
      .add(completeTransfer(tx, opIndex), {
        authenticator: noopAuthenticator,
      })
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

async function createIccfProofOp(
  directoryClient: IClient,
  connection: Connection,
  path: Buffer[],
  hopIndex: number,
  tx: RawGtx,
  targetChainRid: Buffer,
): Promise<Operation> {
  const sourceBlockchainRid =
    hopIndex === 0
      ? connection.client.config.blockchainRid
      : path[hopIndex - 1];

  const proofTx = await createIccfProofTx(
    directoryClient,
    getTransactionRid(tx),
    gtv.gtvHash(tx),
    tx[0][2], // signers
    sourceBlockchainRid.toString("hex"),
    targetChainRid.toString("hex"),
    undefined,
    true,
  );

  return proofTx.iccfTx.operations[0];
}

async function getAppliedTx(
  connection: Connection,
  targetChainRid: Buffer,
  txRid: Buffer,
  opIndex: number,
) {
  const newConnection = await createConnectionToBlockchainRid(
    connection,
    targetChainRid,
  );
  return newConnection.query(applyTransferTx(txRid, opIndex));
}

/**
 * Checks to see whether the specified transfer is already applied to
 * this blockchainRid.
 * @param connection the Connection
 * @param targetChainRid the blockchain rid of the chain to check
 * @param txRid the RID of the transaction containing the transfer
 * @param opIndex the index of the transfer in the transaction
 * @returns a promise that resolves to true if transfer is applied, otherwise resolves to false.
 */
async function isAppliedOnBlockchainRid(
  connection: Connection,
  targetChainRid: Buffer,
  txRid: Buffer,
  opIndex: number,
): Promise<boolean> {
  const newConnection = await createConnectionToBlockchainRid(
    connection,
    targetChainRid,
  );
  return newConnection.query(isTransferApplied(txRid, opIndex));
}

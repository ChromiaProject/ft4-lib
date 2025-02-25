import { Amount } from "@ft4/asset";
import {
  Authenticator,
  SigningError,
  noopAuthenticator,
  days,
} from "@ft4/authentication";
import { EventEmitter, Listener } from "@ft4/events";
import {
  Connection,
  createClientToBlockchain,
  createConnectionToBlockchainRid,
} from "@ft4/ft-session";
import {
  getSystemAnchoringIccfProofOp,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { getTransactionRid, nop } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  BufferId,
  GTX,
  SignedTransaction,
  TransactionReceipt,
  formatter,
  gtx,
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
  Orchestrator,
  OrchestratorCore,
  OrchestratorEvents,
  OrchestratorState,
  TransferRef,
  ResumeOrchestrator,
  RevertOrchestrator,
  OrchestratorData,
  OrchestratorEventHandler,
} from "./types";
/**
 * Creates an orchestrator instance for managing cross-chain transfers.
 * @param connection - The connection.
 * @param authenticator - The authenticator.
 * @param targetChainId - ID of the target blockchain.
 * @param recipientId - ID of the recipient.
 * @param assetId - ID of the asset to be transferred.
 * @param amount - The amount to be transferred.
 * @param ttl - The number of milliseconds after which the transaction can only be reverted.
 * @returns The orchestrator instance with functionalities like initiating transfers,
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

  let state: OrchestratorState;
  const eventEmitter = new EventEmitter<OrchestratorEvents>();

  /**
   * Initialize the transfer by creating the initial transaction.
   */
  async function performInitTransfer(): Promise<OrchestratorCore> {
    try {
      const data = await transactionBuilder(authenticator, connection.client)
        .add(initTransfer(recipientId, assetId, amount, path, Date.now() + ttl))
        .add(nop())
        .buildAndSendWithAnchoring()
        .on("built", (tx) => {
          eventEmitter.emit("TransferSigned", tx);
        });
      const { tx, receipt, systemConfirmationProof } = data;
      eventEmitter.emit("TransferInit", receipt);

      state = {
        tx,
        opIndex: 1,
        systemConfirmationProof,
        nextHopIndex: 0,
      };

      return createOrchestratorCore(eventEmitter, connection, {
        initialOpIndex: 1,
        initialTx: tx,
        path,
      });
    } catch (reason) {
      if (reason instanceof SigningError) {
        throw reason;
      } else {
        throw new InitTransferError(
          `Failed to send transaction: ${reason.message}`,
          reason,
        );
      }
    }
  }

  /**
   * Execute the transfer operation across all steps.
   */
  async function transfer(): Promise<TransferRef> {
    const orchestrator = await performInitTransfer();
    if (state.tx === undefined || state.opIndex === undefined) {
      throw new OrchestratorError(
        "Unable to perform transfer as tx was not initialized properly",
      );
    }
    await orchestrator.performAllApplyTransfers();
    await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
    return {
      tx: orchestrator.initialData.initialTx,
      opIndex: orchestrator.initialData.initialOpIndex,
    };
  }

  return Object.freeze({
    ...unwrapEvents(eventEmitter),
    transfer,
  });
}

/**
 * Creates an orchestrator instance to handle resuming a transfer
 * which was initiated but did not complete properly
 * @param connection - The connection.
 * @param pendingTransfer - The transfer to resume
 * @returns The orchestrator instance which will be able to resume the transfer
 */
export async function createResumeOrchestrator(
  connection: Connection,
  pendingTransfer: TransferRef,
): Promise<ResumeOrchestrator> {
  const operations = pendingTransfer.tx.operations;
  const initTransferOpArgs = operations[pendingTransfer.opIndex].args;
  const path = initTransferOpArgs[3] as Buffer[];

  let state: OrchestratorState;
  const initialData: OrchestratorData = {
    initialTx: pendingTransfer.tx,
    initialOpIndex: pendingTransfer.opIndex,
    path,
  };

  const eventEmitter = new EventEmitter<OrchestratorEvents>();

  /**
   * Accepts a cross chain transfer that was not completed
   * and resumes it. This function returns when the transfer
   * has been successfully completed.
   */
  async function resumeTransfer(): Promise<void> {
    let currentHopIndex: number | undefined = undefined;
    for (let i = 0; i < path.length; i++) {
      if (
        !(await isAppliedOnBlockchainRid(
          connection,
          formatter.ensureBuffer(path[i]),
          getTransactionRid(initialData.initialTx),
          initialData.initialOpIndex,
        ))
      ) {
        break;
      }
      currentHopIndex = i;
    }

    const nextHopIndex = (currentHopIndex ?? -1) + 1;
    let lastBlockchainRid: Buffer;

    // transfer is not completed
    if (nextHopIndex < path.length) {
      // if nextHopIndex is 0, origin chain. Else, the one before that in the path.
      lastBlockchainRid = nextHopIndex
        ? path[nextHopIndex - 1]
        : connection.blockchainRid;
    } else {
      // Transfer already applied, make sure that pending transfer is also cleaned up
      lastBlockchainRid = path.slice(-1)[0];
    }

    let transactionToApply: GTX;
    let opIndex: number;
    if (nextHopIndex === 0) {
      transactionToApply = initialData.initialTx;
      opIndex = initialData.initialOpIndex;
    } else {
      const res = await getAppliedTx(
        connection,
        lastBlockchainRid,
        getTransactionRid(initialData.initialTx),
        initialData.initialOpIndex,
      );
      transactionToApply = formatter.rawGtxToGtx(res.tx);
      opIndex = res.op_index;
    }

    const previousBlockchainClient = await createClientToBlockchain(
      connection.client,
      lastBlockchainRid,
    );

    state = {
      tx: transactionToApply,
      opIndex: opIndex,
      nextHopIndex,
      systemConfirmationProof: getSystemAnchoringIccfProofOp(
        previousBlockchainClient,
        transactionToApply,
      ),
    };

    const orchestrator = await createOrchestratorCore(
      eventEmitter,
      connection,
      initialData,
      state,
    );

    await orchestrator.performAllApplyTransfers();

    await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
  }

  return Object.freeze({
    ...unwrapEvents(eventEmitter),
    resumeTransfer,
  });
}

/**
 * Creates an orchestrator instance to handle reverting a transfer that was started
 * but did not reach its target chain withing the specified timeout.
 * @param connection - a connection to the source chain
 * @param pendingTransfer - the pending transfer to revert
 * @returns The orchestrator instance which will be able to revert the transfer
 */
export async function createRevertOrchestrator(
  connection: Connection,
  pendingTransfer: TransferRef,
): Promise<RevertOrchestrator> {
  const operations = pendingTransfer.tx.operations;
  const initTransferOpArgs = operations[pendingTransfer.opIndex].args;
  const path = initTransferOpArgs[3] as Buffer[];

  let state: OrchestratorState;

  const eventEmitter = new EventEmitter<OrchestratorEvents>();

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

    let lastBlockchainRid: Buffer;
    let tx: GTX;
    let opIndex: number;

    if (firstNotAppliedHopIndex === 0) {
      lastBlockchainRid = formatter.toBuffer(
        connection.client.config.blockchainRid,
      );
      tx = pendingTransfer.tx;
      opIndex = pendingTransfer.opIndex;
    } else {
      lastBlockchainRid = path[firstNotAppliedHopIndex - 1];
      const res = await getAppliedTx(
        connection,
        lastBlockchainRid,
        getTransactionRid(pendingTransfer.tx),
        pendingTransfer.opIndex,
      );
      tx = formatter.rawGtxToGtx(res.tx);
      opIndex = res.op_index;
    }

    const targetBlockchainRid = path[firstNotAppliedHopIndex];

    const previousBlockchainClient = await createClientToBlockchain(
      connection.client,
      lastBlockchainRid,
    );

    const iccfOp = await getSystemAnchoringIccfProofOp(
      previousBlockchainClient,
      tx,
    )(targetBlockchainRid);

    const tb = await getTransactionBuilderForChain(
      connection,
      targetBlockchainRid,
    );

    try {
      const { tx: transaction, systemConfirmationProof } = await tb
        .add(iccfOp)
        .add(
          cancelTransfer(
            pendingTransfer.tx,
            pendingTransfer.opIndex,
            tx,
            opIndex,
            firstNotAppliedHopIndex,
          ),
        )
        .buildAndSendWithAnchoring();

      eventEmitter.emit("TransferHop", targetBlockchainRid);
      state = {
        tx: transaction,
        nextHopIndex: firstNotAppliedHopIndex - 1,
        systemConfirmationProof,
        opIndex: 1,
      };
    } catch (error) {
      throw new OrchestratorError(
        `Unable to fetch proof: ${(error as any)?.message ?? error}`,
        error as Error,
      );
    }
    await performAllRevertTransfers(firstNotAppliedHopIndex);
  }

  async function recallUnclaimedTransfer(): Promise<void> {
    const targetBlockchainRid = path[path.length - 1];

    const tb = await getTransactionBuilderForChain(
      connection,
      targetBlockchainRid,
    );

    try {
      const { tx, systemConfirmationProof } = await tb
        .add(
          reclaimUnclaimedTransferOp(
            pendingTransfer.tx,
            pendingTransfer.opIndex,
          ),
        )
        .buildAndSendWithAnchoring();

      eventEmitter.emit("TransferHop", targetBlockchainRid);
      state = {
        tx,
        systemConfirmationProof,
        opIndex: 0,
        nextHopIndex: path.length - 2,
      };
    } catch (error) {
      throw new OrchestratorError(
        `Unable to fetch proof: ${(error as any)?.message ?? error}`,
        error as Error,
      );
    }

    await performAllRevertTransfers(path.length - 1);
  }

  async function performAllRevertTransfers(
    firstNotAppliedHopIndex: number,
  ): Promise<void> {
    for (let hop = firstNotAppliedHopIndex - 1; hop >= 0; hop--) {
      const targetBlockchainRid = path[hop];

      const iccfOp = await state.systemConfirmationProof(targetBlockchainRid);

      const tb = await getTransactionBuilderForChain(
        connection,
        targetBlockchainRid,
      );

      try {
        const { tx, systemConfirmationProof } = await tb
          .add(iccfOp)
          .add(
            unapplyTransfer(
              pendingTransfer.tx,
              pendingTransfer.opIndex,
              state.tx,
              state.opIndex,
              hop,
            ),
          )
          .buildAndSendWithAnchoring();

        eventEmitter.emit("TransferHop", targetBlockchainRid);

        state = {
          tx,
          systemConfirmationProof,
          opIndex: 1,
          nextHopIndex: hop - 1,
        };
      } catch (error) {
        throw new OrchestratorError(
          `Unable to fetch proof: ${(error as any)?.message ?? error}`,
          error as Error,
        );
      }
    }

    const finalIccfOp = await state.systemConfirmationProof(
      connection.blockchainRid,
    );

    await transactionBuilder(noopAuthenticator, connection.client)
      .add(finalIccfOp, { authenticator: noopAuthenticator })
      .add(
        revertTransferOp(
          pendingTransfer.tx,
          pendingTransfer.opIndex,
          state.tx,
          state.opIndex,
        ),
      )
      .buildAndSend();
  }

  return Object.freeze({
    ...unwrapEvents(eventEmitter),
    revertTransfer,
    recallUnclaimedTransfer,
  });
}

async function createOrchestratorCore(
  emitter: EventEmitter<OrchestratorEvents>,
  connection: Connection,
  initialData: OrchestratorData,
  initialState?: OrchestratorState,
): Promise<OrchestratorCore> {
  let state: OrchestratorState = initialState ?? {
    nextHopIndex: 0,
    tx: initialData.initialTx,
    opIndex: initialData.initialOpIndex,
    systemConfirmationProof: getSystemAnchoringIccfProofOp(
      connection.client,
      initialData.initialTx,
    ),
  };

  /**
   * Apply the transfer operation targeting a specific blockchain.
   * @param hopIndex hop index
   * @param targetChainRid - The ID of the target blockchain.
   */
  async function performSingleApplyTransfer(
    hopIndex: number,
  ): Promise<OrchestratorState> {
    const targetBlockchainRid = initialData.path[state.nextHopIndex];

    const iccfOp = await state.systemConfirmationProof(targetBlockchainRid);
    const tb = await getTransactionBuilderForChain(
      connection,
      targetBlockchainRid,
    );

    try {
      const { tx, systemConfirmationProof } = await tb
        .add(iccfOp)
        .add(
          applyTransfer(
            initialData.initialTx,
            initialData.initialOpIndex,
            state.tx!,
            state.opIndex!,
            hopIndex,
          ),
        )
        .buildAndSendWithAnchoring();
      emitter.emit("TransferHop", targetBlockchainRid);
      return {
        tx,
        systemConfirmationProof,
        nextHopIndex: hopIndex + 1,
        opIndex: 1,
      };
    } catch (error) {
      throw new ApplyTransferError(
        `Unable to apply transfer: ${(error as any)?.message ?? error}`,
        error as Error,
      );
    }
  }

  async function performAllApplyTransfers() {
    for (
      let hopIndex = state.nextHopIndex;
      hopIndex < initialData.path.length;
      hopIndex++
    ) {
      state = await performSingleApplyTransfer(hopIndex);
    }
  }

  async function performCompleteTransfer() {
    const targetChainRid = initialData.path.slice(-1)[0];

    const tb = await getTransactionBuilderForChain(
      connection,
      Buffer.from(connection.client.config.blockchainRid, "hex"),
    );
    await tb
      .add(await state.systemConfirmationProof(targetChainRid))
      .add(completeTransfer(gtx.gtxToRawGtx(state.tx), state.opIndex))
      .buildAndSend();
  }

  return Object.freeze({
    state,
    initialData,
    eventEmitter: emitter,
    performAllApplyTransfers,
    performCompleteTransfer,
    ...unwrapEvents(emitter),
  });
}

async function getTransactionBuilderForChain(
  connection: Connection,
  blockchainRid: Buffer,
  authenticator: Authenticator = noopAuthenticator,
) {
  const newConnection = await createConnectionToBlockchainRid(
    connection,
    blockchainRid,
  );
  return transactionBuilder(authenticator, newConnection.client);
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
 * @param connection - the Connection
 * @param targetChainRid - the blockchain rid of the chain to check
 * @param txRid - the RID of the transaction containing the transfer
 * @param opIndex - the index of the transfer in the transaction
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

/* Cross-Chain Transfer convenience event handlers */
function unwrapEvents(
  emitter: EventEmitter<OrchestratorEvents>,
): OrchestratorEventHandler {
  return {
    onTransferInit: (listener: Listener<[TransactionReceipt]>) => {
      return emitter.on("TransferInit", listener);
    },
    offTransferInit: (listener: Listener<[TransactionReceipt]>) => {
      return emitter.off("TransferInit", listener);
    },
    onTransferSigned: (listener: Listener<[SignedTransaction]>) => {
      return emitter.on("TransferSigned", listener);
    },
    offTransferSigned: (listener: Listener<[SignedTransaction]>) => {
      return emitter.off("TransferSigned", listener);
    },
    onTransferHop: (listener: Listener<[BufferId]>) => {
      return emitter.on("TransferHop", listener);
    },
    offTransferHop: (listener: Listener<[BufferId]>) => {
      return emitter.off("TransferHop", listener);
    },
  };
}

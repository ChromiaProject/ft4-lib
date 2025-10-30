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
  console.log(`[ORCHESTRATOR DEBUG] === createOrchestrator ENTRY ===`);
  console.log(`[ORCHESTRATOR DEBUG] Source chain RID: ${connection.blockchainRid.toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Target chain ID: ${targetChainId.toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Recipient ID: ${recipientId.toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Asset ID: ${assetId.toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Amount: ${amount}`);
  console.log(`[ORCHESTRATOR DEBUG] TTL: ${ttl}`);

  const asset = await connection.getAssetById(assetId);
  if (!asset) {
    console.error(`[ORCHESTRATOR DEBUG] Asset not found: ${assetId.toString('hex')}`);
    throw new FactoryError("The specified asset could not be found");
  }
  console.log(`[ORCHESTRATOR DEBUG] Asset found:`, asset);

  console.log(`[ORCHESTRATOR DEBUG] Finding path to target chain...`);
  const path = await findPathToChainForAsset(connection, asset, targetChainId);
  console.log(`[ORCHESTRATOR DEBUG] Path found - length: ${path.length}`);
  path.forEach((chainRid, index) => {
    console.log(`[ORCHESTRATOR DEBUG] Path[${index}]: ${chainRid.toString('hex')}`);
  });

  let state: OrchestratorState;
  const eventEmitter = new EventEmitter<OrchestratorEvents>();

  /**
   * Initialize the transfer by creating the initial transaction.
   */
  async function performInitTransfer(): Promise<OrchestratorCore> {
    console.log(`[ORCHESTRATOR DEBUG] === performInitTransfer ENTRY ===`);
    try {
      console.log(`[ORCHESTRATOR DEBUG] Building init transfer transaction...`);
      const data = await transactionBuilder(authenticator, connection.client)
        .add(initTransfer(recipientId, assetId, amount, path, Date.now() + ttl))
        //TODO timebomb
        .add(nop())
        .buildAndSendWithAnchoring()
        .on("built", (tx) => {
          console.log(`[ORCHESTRATOR DEBUG] Transaction built:`, tx);
          eventEmitter.emit("TransferSigned", tx);
        });
      const { tx, receipt, systemConfirmationProof } = data;
      console.log(`[ORCHESTRATOR DEBUG] Init transfer completed - TX RID: ${getTransactionRid(tx, connection).toString('hex')}`);
      eventEmitter.emit("TransferInit", receipt);

      state = {
        tx,
        opIndex: 1,
        systemConfirmationProof,
        nextHopIndex: 0,
      };
      console.log(`[ORCHESTRATOR DEBUG] Initial state set - opIndex: 1, nextHopIndex: 0`);

      console.log(`[ORCHESTRATOR DEBUG] Creating orchestrator core...`);
      return createOrchestratorCore(eventEmitter, connection, {
        initialOpIndex: 1,
        initialTx: tx,
        path,
      });
    } catch (reason) {
      console.error(`[ORCHESTRATOR DEBUG] performInitTransfer ERROR:`, reason);
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
    console.log(`[ORCHESTRATOR DEBUG] === transfer ENTRY ===`);
    const orchestrator = await performInitTransfer();
    if (state.tx === undefined || state.opIndex === undefined) {
      console.error(`[ORCHESTRATOR DEBUG] State not properly initialized - tx: ${!!state.tx}, opIndex: ${state.opIndex}`);
      throw new OrchestratorError(
        "Unable to perform transfer as tx was not initialized properly",
      );
    }
    console.log(`[ORCHESTRATOR DEBUG] Performing all apply transfers...`);
    await orchestrator.performAllApplyTransfers();
    console.log(`[ORCHESTRATOR DEBUG] Performing complete transfer...`);
    await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
    console.log(`[ORCHESTRATOR DEBUG] Transfer completed successfully`);
    return {
      tx: orchestrator.initialData.initialTx,
      opIndex: orchestrator.initialData.initialOpIndex,
    };
  }

  console.log(`[ORCHESTRATOR DEBUG] === createOrchestrator EXIT ===`);
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
  console.log(`[ORCHESTRATOR DEBUG] === createResumeOrchestrator ENTRY ===`);
  console.log(`[ORCHESTRATOR DEBUG] Pending transfer TX RID: ${getTransactionRid(pendingTransfer.tx, connection).toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Pending transfer opIndex: ${pendingTransfer.opIndex}`);
  
  const operations = pendingTransfer.tx.operations;
  const initTransferOpArgs = operations[pendingTransfer.opIndex].args;
  const path = initTransferOpArgs[3] as Buffer[];
  
  console.log(`[ORCHESTRATOR DEBUG] Path extracted - length: ${path.length}`);
  path.forEach((chainRid, index) => {
    console.log(`[ORCHESTRATOR DEBUG] Path[${index}]: ${chainRid.toString('hex')}`);
  });

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
    console.log(`[ORCHESTRATOR DEBUG] === resumeTransfer starting ===`);
    console.log(`[ORCHESTRATOR DEBUG] Path length: ${path.length}`);
    console.log(`[ORCHESTRATOR DEBUG] Initial TX RID: ${getTransactionRid(initialData.initialTx, connection).toString('hex')}`);
    
    let currentHopIndex: number | undefined = undefined;
    for (let i = 0; i < path.length; i++) {
      console.log(`[ORCHESTRATOR DEBUG] Checking hop ${i} - chain: ${path[i].toString('hex')}`);
      if (
        !(await isAppliedOnBlockchainRid(
          connection,
          formatter.ensureBuffer(path[i]),
          getTransactionRid(initialData.initialTx, connection),
          initialData.initialOpIndex,
        ))
      ) {
        console.log(`[ORCHESTRATOR DEBUG] Transfer not applied on hop ${i}, breaking`);
        break;
      }
      console.log(`[ORCHESTRATOR DEBUG] Transfer applied on hop ${i}`);
      currentHopIndex = i;
    }

    const nextHopIndex = (currentHopIndex ?? -1) + 1;
    let lastBlockchainRid: Buffer;

    console.log(`[ORCHESTRATOR DEBUG] Next hop index: ${nextHopIndex}, Current hop index: ${currentHopIndex}`);

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

    console.log(`[ORCHESTRATOR DEBUG] Last blockchain RID: ${lastBlockchainRid.toString('hex')}`);

    let transactionToApply: GTX;
    let opIndex: number;
    if (nextHopIndex === 0) {
      console.log(`[ORCHESTRATOR DEBUG] Using initial transaction for hop 0`);
      transactionToApply = initialData.initialTx;
      opIndex = initialData.initialOpIndex;
    } else {
      console.log(`[ORCHESTRATOR DEBUG] Getting applied tx from chain ${lastBlockchainRid.toString('hex')}`);
      const res = await getAppliedTx(
        connection,
        lastBlockchainRid,
        getTransactionRid(initialData.initialTx, connection),
        initialData.initialOpIndex,
      );
      transactionToApply = formatter.rawGtxToGtx(res.tx);
      opIndex = res.op_index;
      console.log(`[ORCHESTRATOR DEBUG] Retrieved applied tx with RID: ${getTransactionRid(transactionToApply, connection).toString('hex')}`);
    }

    console.log(`[ORCHESTRATOR DEBUG] Creating client for blockchain: ${lastBlockchainRid.toString('hex')}`);
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
    console.log(`[ORCHESTRATOR DEBUG] Resume state set - opIndex: ${opIndex}, nextHopIndex: ${nextHopIndex}`);

    console.log(`[ORCHESTRATOR DEBUG] Creating orchestrator core for resume...`);
    const orchestrator = await createOrchestratorCore(
      eventEmitter,
      connection,
      initialData,
      state,
    );

    console.log(`[ORCHESTRATOR DEBUG] Performing remaining apply transfers...`);
    await orchestrator.performAllApplyTransfers();

    console.log(`[ORCHESTRATOR DEBUG] Performing complete transfer...`);
    await orchestrator.performCompleteTransfer(state.tx, state.opIndex);
    console.log(`[ORCHESTRATOR DEBUG] === resumeTransfer EXIT ===`);
  }

  console.log(`[ORCHESTRATOR DEBUG] === createResumeOrchestrator EXIT ===`);
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
  console.log(`[ORCHESTRATOR DEBUG] === createRevertOrchestrator ENTRY ===`);
  console.log(`[ORCHESTRATOR DEBUG] Pending transfer TX RID: ${getTransactionRid(pendingTransfer.tx, connection).toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Pending transfer opIndex: ${pendingTransfer.opIndex}`);
  
  const operations = pendingTransfer.tx.operations;
  const initTransferOpArgs = operations[pendingTransfer.opIndex].args;
  const path = initTransferOpArgs[3] as Buffer[];
  
  console.log(`[ORCHESTRATOR DEBUG] Path extracted - length: ${path.length}`);
  path.forEach((chainRid, index) => {
    console.log(`[ORCHESTRATOR DEBUG] Path[${index}]: ${chainRid.toString('hex')}`);
  });

  let state: OrchestratorState;

  const eventEmitter = new EventEmitter<OrchestratorEvents>();

  async function revertTransfer(): Promise<void> {
    console.log(`[ORCHESTRATOR DEBUG] === revertTransfer ENTRY ===`);
    let firstNotAppliedHopIndex: number | undefined = undefined;
    for (let i = 0; i < path.length; i++) {
      console.log(`[ORCHESTRATOR DEBUG] Checking revert hop ${i} - chain: ${path[i].toString('hex')}`);
      if (
        !(await isAppliedOnBlockchainRid(
          connection,
          formatter.ensureBuffer(path[i]),
          getTransactionRid(pendingTransfer.tx, connection),
          pendingTransfer.opIndex,
        ))
      ) {
        firstNotAppliedHopIndex = i;
        console.log(`[ORCHESTRATOR DEBUG] First not applied hop found at index: ${i}`);
        break;
      }
      console.log(`[ORCHESTRATOR DEBUG] Hop ${i} is applied`);
    }

    if (firstNotAppliedHopIndex === undefined) {
      console.log(`[ORCHESTRATOR DEBUG] Transfer is fully applied, cannot revert`);
      throw new OrchestratorError("Transfer is already applied, cannot revert");
    }
    console.log(`[ORCHESTRATOR DEBUG] First not applied hop index: ${firstNotAppliedHopIndex}`);

    let lastBlockchainRid: Buffer;
    let tx: GTX;
    let opIndex: number;

    if (firstNotAppliedHopIndex === 0) {
      console.log(`[ORCHESTRATOR DEBUG] Using original transaction (not applied hop is 0)`);
      lastBlockchainRid = formatter.toBuffer(
        connection.client.config.blockchainRid,
      );
      tx = pendingTransfer.tx;
      opIndex = pendingTransfer.opIndex;
    } else {
      console.log(`[ORCHESTRATOR DEBUG] Getting applied tx from hop ${firstNotAppliedHopIndex - 1}`);
      lastBlockchainRid = path[firstNotAppliedHopIndex - 1];
      const res = await getAppliedTx(
        connection,
        lastBlockchainRid,
        getTransactionRid(pendingTransfer.tx, connection),
        pendingTransfer.opIndex,
      );
      tx = formatter.rawGtxToGtx(res.tx);
      opIndex = res.op_index;
      console.log(`[ORCHESTRATOR DEBUG] Retrieved tx for revert with RID: ${getTransactionRid(tx, connection).toString('hex')}`);
    }
    console.log(`[ORCHESTRATOR DEBUG] Last blockchain RID: ${lastBlockchainRid.toString('hex')}`);

    const targetBlockchainRid = path[firstNotAppliedHopIndex];
    console.log(`[ORCHESTRATOR DEBUG] Target blockchain RID for cancel: ${targetBlockchainRid.toString('hex')}`);

    console.log(`[ORCHESTRATOR DEBUG] Creating client for previous blockchain...`);
    const previousBlockchainClient = await createClientToBlockchain(
      connection.client,
      lastBlockchainRid,
    );

    console.log(`[ORCHESTRATOR DEBUG] Getting ICCF proof for cancel transfer...`);
    const iccfOp = await getSystemAnchoringIccfProofOp(
      previousBlockchainClient,
      tx,
    )(targetBlockchainRid);

    const tb = await getTransactionBuilderForChain(
      connection,
      targetBlockchainRid,
    );

    try {
      console.log(`[ORCHESTRATOR DEBUG] Building cancel transfer transaction...`);
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

      console.log(`[ORCHESTRATOR DEBUG] Cancel transfer completed - TX RID: ${getTransactionRid(transaction, connection).toString('hex')}`);
      eventEmitter.emit("TransferHop", targetBlockchainRid);
      state = {
        tx: transaction,
        nextHopIndex: firstNotAppliedHopIndex - 1,
        systemConfirmationProof,
        opIndex: 1,
      };
      console.log(`[ORCHESTRATOR DEBUG] State set for revert - nextHopIndex: ${firstNotAppliedHopIndex - 1}`);
    } catch (error) {
      console.error(`[ORCHESTRATOR DEBUG] Error in revertTransfer:`, error);
      throw new OrchestratorError(
        `Unable to fetch proof: ${(error as any)?.message ?? error}`,
        error as Error,
      );
    }
    await performAllRevertTransfers(firstNotAppliedHopIndex);
    console.log(`[ORCHESTRATOR DEBUG] === revertTransfer EXIT ===`);
  }

  async function recallUnclaimedTransfer(): Promise<void> {
    console.log(`[ORCHESTRATOR DEBUG] === recallUnclaimedTransfer ENTRY ===`);
    const targetBlockchainRid = path[path.length - 1];
    console.log(`[ORCHESTRATOR DEBUG] Target blockchain RID: ${targetBlockchainRid.toString('hex')}`);

    const tb = await getTransactionBuilderForChain(
      connection,
      targetBlockchainRid,
    );

    try {
      console.log(`[ORCHESTRATOR DEBUG] Building recall unclaimed transfer transaction...`);
      const { tx, systemConfirmationProof } = await tb
        .add(
          reclaimUnclaimedTransferOp(
            pendingTransfer.tx,
            pendingTransfer.opIndex,
          ),
        )
        .buildAndSendWithAnchoring();

      console.log(`[ORCHESTRATOR DEBUG] Recall unclaimed transfer completed - TX RID: ${getTransactionRid(tx, connection).toString('hex')}`);
      eventEmitter.emit("TransferHop", targetBlockchainRid);
      state = {
        tx,
        systemConfirmationProof,
        opIndex: 0,
        nextHopIndex: path.length - 2,
      };
      console.log(`[ORCHESTRATOR DEBUG] State set for recall - nextHopIndex: ${path.length - 2}`);
    } catch (error) {
      console.error(`[ORCHESTRATOR DEBUG] Error in recallUnclaimedTransfer:`, error);
      console.log("error:::::::::::: ", JSON.stringify(error, null, 2));
      throw new OrchestratorError(
        `Unable to fetch proof: ${(error as any)?.message ?? error}`,
        error as Error,
      );
    }

    await performAllRevertTransfers(path.length - 1);
    console.log(`[ORCHESTRATOR DEBUG] === recallUnclaimedTransfer EXIT ===`);
  }

  async function performAllRevertTransfers(
    firstNotAppliedHopIndex: number,
  ): Promise<void> {
    console.log(`[ORCHESTRATOR DEBUG] === performAllRevertTransfers ENTRY ===`);
    console.log(`[ORCHESTRATOR DEBUG] Starting from hop: ${firstNotAppliedHopIndex - 1}, going to hop 0`);
    for (let hop = firstNotAppliedHopIndex - 1; hop >= 0; hop--) {
      const targetBlockchainRid = path[hop];
      console.log(`[ORCHESTRATOR DEBUG] Reverting hop ${hop} - chain: ${targetBlockchainRid.toString('hex')}`);

      const iccfOp = await state.systemConfirmationProof(targetBlockchainRid);

      const tb = await getTransactionBuilderForChain(
        connection,
        targetBlockchainRid,
      );

      try {
        console.log(`[ORCHESTRATOR DEBUG] Building unapply transfer for hop ${hop}...`);
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

        console.log(`[ORCHESTRATOR DEBUG] Unapply transfer completed for hop ${hop} - TX RID: ${getTransactionRid(tx, connection).toString('hex')}`);
        eventEmitter.emit("TransferHop", targetBlockchainRid);

        state = {
          tx,
          systemConfirmationProof,
          opIndex: 1,
          nextHopIndex: hop - 1,
        };
        console.log(`[ORCHESTRATOR DEBUG] State updated - nextHopIndex: ${hop - 1}`);
      } catch (error) {
        console.error(`[ORCHESTRATOR DEBUG] Error in performAllRevertTransfers hop ${hop}:`, error);
        throw new OrchestratorError(
          `Unable to fetch proof: ${(error as any)?.message ?? error}`,
          error as Error,
        );
      }
    }

    console.log(`[ORCHESTRATOR DEBUG] Performing final revert on source chain...`);
    const finalIccfOp = await state.systemConfirmationProof(
      connection.blockchainRid,
    );

    console.log(`[ORCHESTRATOR DEBUG] Building final revert transaction...`);
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
    console.log(`[ORCHESTRATOR DEBUG] === performAllRevertTransfers EXIT ===`);
  }

  console.log(`[ORCHESTRATOR DEBUG] === createRevertOrchestrator EXIT ===`);
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
  console.log(`[ORCHESTRATOR DEBUG] === createOrchestratorCore ENTRY ===`);
  console.log(`[ORCHESTRATOR DEBUG] Initial data - TX RID: ${getTransactionRid(initialData.initialTx, connection).toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Initial data - opIndex: ${initialData.initialOpIndex}`);
  console.log(`[ORCHESTRATOR DEBUG] Initial data - path length: ${initialData.path.length}`);
  console.log(`[ORCHESTRATOR DEBUG] Initial state provided: ${!!initialState}`);
  
  let state: OrchestratorState = initialState ?? {
    nextHopIndex: 0,
    tx: initialData.initialTx,
    opIndex: initialData.initialOpIndex,
    systemConfirmationProof: getSystemAnchoringIccfProofOp(
      connection.client,
      initialData.initialTx,
    ),
  };
  
  console.log(`[ORCHESTRATOR DEBUG] Core state - nextHopIndex: ${state.nextHopIndex}, opIndex: ${state.opIndex}`);

  /**
   * Apply the transfer operation targeting a specific blockchain.
   * @param hopIndex hop index
   * @param targetChainRid - The ID of the target blockchain.
   */
  async function performSingleApplyTransfer(
    hopIndex: number,
  ): Promise<OrchestratorState> {
    const targetBlockchainRid = initialData.path[state.nextHopIndex];

    console.log(`[ORCHESTRATOR DEBUG] === performSingleApplyTransfer hop ${hopIndex} ===`);
    console.log(`[ORCHESTRATOR DEBUG] Target chain RID: ${targetBlockchainRid.toString('hex')}`);
    console.log(`[ORCHESTRATOR DEBUG] Initial TX RID: ${getTransactionRid(initialData.initialTx, connection).toString('hex')}`);
    console.log(`[ORCHESTRATOR DEBUG] Current state TX RID: ${getTransactionRid(state.tx!, connection).toString('hex')}`);

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
      
      console.log(`[ORCHESTRATOR DEBUG] New TX after applyTransfer RID: ${getTransactionRid(tx, connection).toString('hex')}`);
      console.log(`[ORCHESTRATOR DEBUG] === End hop ${hopIndex} ===`);
      
      emitter.emit("TransferHop", targetBlockchainRid);
      return {
        tx,
        systemConfirmationProof,
        nextHopIndex: hopIndex + 1,
        opIndex: 1,
      };
    } catch (error) {
      console.error(`[ORCHESTRATOR DEBUG] Error in performSingleApplyTransfer hop ${hopIndex}:`, error);
      throw new ApplyTransferError(
        `Unable to apply transfer: ${(error as any)?.message ?? error}`,
        error as Error,
      );
    }
  }

  async function performAllApplyTransfers() {
    console.log(`[ORCHESTRATOR DEBUG] === performAllApplyTransfers ENTRY ===`);
    console.log(`[ORCHESTRATOR DEBUG] Starting from hopIndex: ${state.nextHopIndex}, path length: ${initialData.path.length}`);
    for (
      let hopIndex = state.nextHopIndex;
      hopIndex < initialData.path.length;
      hopIndex++
    ) {
      console.log(`[ORCHESTRATOR DEBUG] Performing apply transfer for hop ${hopIndex}`);
      state = await performSingleApplyTransfer(hopIndex);
      console.log(`[ORCHESTRATOR DEBUG] Completed hop ${hopIndex}, new state - nextHopIndex: ${state.nextHopIndex}`);
    }
    console.log(`[ORCHESTRATOR DEBUG] === performAllApplyTransfers EXIT ===`);
  }

  async function performCompleteTransfer() {
    console.log(`[ORCHESTRATOR DEBUG] === performCompleteTransfer ENTRY ===`);
    const targetChainRid = initialData.path.slice(-1)[0];
    console.log(`[ORCHESTRATOR DEBUG] Target chain RID: ${targetChainRid.toString('hex')}`);
    console.log(`[ORCHESTRATOR DEBUG] Source chain RID: ${Buffer.from(connection.client.config.blockchainRid, "hex").toString('hex')}`);
    console.log(`[ORCHESTRATOR DEBUG] State TX RID: ${getTransactionRid(state.tx!, connection).toString('hex')}`);
    console.log(`[ORCHESTRATOR DEBUG] State opIndex: ${state.opIndex}`);

    const tb = await getTransactionBuilderForChain(
      connection,
      Buffer.from(connection.client.config.blockchainRid, "hex"),
    );

    console.log(`[ORCHESTRATOR DEBUG] Getting ICCF proof for complete transfer...`);
    const iccfOp = await state.systemConfirmationProof(targetChainRid);

    console.log(`[ORCHESTRATOR DEBUG] Building complete transfer transaction...`);
    await tb
      .add(iccfOp)
      .add(completeTransfer(gtx.gtxToRawGtx(state.tx), state.opIndex))
      .buildAndSend();
    console.log(`[ORCHESTRATOR DEBUG] === performCompleteTransfer EXIT ===`);
  }

  console.log(`[ORCHESTRATOR DEBUG] === createOrchestratorCore EXIT ===`);
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
  console.log(`[ORCHESTRATOR DEBUG] === getTransactionBuilderForChain ===`);
  console.log(`[ORCHESTRATOR DEBUG] Creating connection to chain: ${blockchainRid.toString('hex')}`);
  
  const newConnection = await createConnectionToBlockchainRid(
    connection,
    blockchainRid,
  );
  
  console.log(`[ORCHESTRATOR DEBUG] New connection client config:`, {
    blockchainRid: newConnection.client.config.blockchainRid,
  });
  console.log(`[ORCHESTRATOR DEBUG] === End getTransactionBuilderForChain ===`);
  
  return transactionBuilder(authenticator, newConnection.client);
}

async function getAppliedTx(
  connection: Connection,
  targetChainRid: Buffer,
  txRid: Buffer,
  opIndex: number,
) {
  console.log(`[ORCHESTRATOR DEBUG] === getAppliedTx ===`);
  console.log(`[ORCHESTRATOR DEBUG] Target chain RID: ${targetChainRid.toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Looking for TX RID: ${txRid.toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Op index: ${opIndex}`);

  const newConnection = await createConnectionToBlockchainRid(
    connection,
    targetChainRid,
  );
  
  try {
    const result = await newConnection.query(applyTransferTx(txRid, opIndex));
    console.log(`[ORCHESTRATOR DEBUG] Found applied TX with RID: ${getTransactionRid(formatter.rawGtxToGtx(result.tx), newConnection).toString('hex')}`);
    
    // CRITICAL DEBUG: Show how the same tx gets different RIDs with different connection contexts
    const originalTx = formatter.rawGtxToGtx(result.tx);
    const ridFromOriginalConnection = getTransactionRid(originalTx, connection);
    const ridFromTargetConnection = getTransactionRid(originalTx, newConnection);
    
    console.log(`[ORCHESTRATOR DEBUG] CRITICAL RID COMPARISON:`);
    console.log(`[ORCHESTRATOR DEBUG] TX RID calculated with original connection: ${ridFromOriginalConnection.toString('hex')}`);
    console.log(`[ORCHESTRATOR DEBUG] TX RID calculated with target connection: ${ridFromTargetConnection.toString('hex')}`);
    console.log(`[ORCHESTRATOR DEBUG] RIDs match: ${ridFromOriginalConnection.equals(ridFromTargetConnection)}`);
    
    console.log(`[ORCHESTRATOR DEBUG] === End getAppliedTx ===`);
    return result;
  } catch (error) {
    console.error(`[ORCHESTRATOR DEBUG] Error in getAppliedTx:`, error);
    console.log(`[ORCHESTRATOR DEBUG] === End getAppliedTx (ERROR) ===`);
    throw error;
  }
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
  console.log(`[ORCHESTRATOR DEBUG] === isAppliedOnBlockchainRid ===`);
  console.log(`[ORCHESTRATOR DEBUG] Target chain RID: ${targetChainRid.toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Checking TX RID: ${txRid.toString('hex')}`);
  console.log(`[ORCHESTRATOR DEBUG] Op index: ${opIndex}`);

  const newConnection = await createConnectionToBlockchainRid(
    connection,
    targetChainRid,
  );
  
  try {
    const result = await newConnection.query(isTransferApplied(txRid, opIndex));
    console.log(`[ORCHESTRATOR DEBUG] Transfer applied result: ${result}`);
    console.log(`[ORCHESTRATOR DEBUG] === End isAppliedOnBlockchainRid ===`);
    return result;
  } catch (error) {
    console.error(`[ORCHESTRATOR DEBUG] Error in isAppliedOnBlockchainRid:`, error);
    console.log(`[ORCHESTRATOR DEBUG] === End isAppliedOnBlockchainRid (ERROR) ===`);
    throw error;
  }
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

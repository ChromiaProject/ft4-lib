import {
  Operation,
  SignedTransaction,
  createClient,
  createIccfProofTx,
  formatter,
  gtv,
  gtx,
} from "postchain-client";
import { Amount } from "../asset/interfaces";
import { createNoopAuthenticator } from "../authentication";
import { EventEmitter, Listener } from "../events";
import { createAuthDataService } from "../ft-session";
import { Session } from "../types";
import { getTransactionRID } from "../utils";
import { transactionBuilder } from "../utils/transaction-builder";
import { OrchestratorError } from "./errors";
import {
  applyTransfer as applyTransferOp,
  deletePendingTransfer as deletePendingTransferOp,
  initTransfer as initTransferOp,
} from "./operations";
import { createConnectionToBrid, findPathToChainForAsset } from "./pathfinder";
import { isTransferApplied } from "./queries";
import { Orchestrator, OrchestratorEvents, PendingTransfer } from "./types";
import { BufferId } from "/cryptoUtils";

type State = {
  currentHopIndex: number;
  path: Buffer[];
  tx?: SignedTransaction;
  initialTx?: SignedTransaction;
};

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

  const path = await findPathToChainForAsset(session, asset, targetChainId);

  // Create a local event emitter instance for this orchestrator.
  const localEmitter = new EventEmitter<OrchestratorEvents>();

  const state: State = {
    currentHopIndex: 0,
    path,
  };

  const directoryClient = await createClient({
    directoryNodeUrlPool: session.client.config.endpointPool.slice(),
    blockchainIid: 0,
  });

  /**
   * Initialize the transfer by creating the initial transaction.
   * @returns {Promise<void>}
   */
  async function initTransfer(): Promise<void> {
    return new Promise((resolve) => {
      const tb = session.transactionBuilder();

      tb.add(initTransferOp(recipientId, assetId, amount, path), () =>
        resolve(),
      )
        .buildAndSend()
        .then(({ tx }) => {
          state.tx = tx;
          state.initialTx = tx;
        });
    });
  }

  /**
   * Apply the transfer operation targeting a specific bridge.
   * @param {IClient} directoryClient - The client for the directory chain.
   * @param {Buffer} targetChainBrid - The ID of the target bridge.
   * @returns {Promise<void>}
   */
  async function applyTransfer(targetChainBrid: Buffer): Promise<void> {
    const tb = await getTransactionBuilderForChain(session, targetChainBrid);

    const iccfOp = await createIccfProofOperation(
      targetChainBrid,
      path.indexOf(targetChainBrid),
    );

    return new Promise((resolve) => {
      tb.add(iccfOp)
        .add(
          applyTransferOp(
            recipientId,
            assetId,
            amount,
            path,
            state.tx,
            path.indexOf(targetChainBrid),
          ),
          () => {
            resolve();
          },
        )
        .buildAndSend()
        .then(({ tx }) => {
          state.tx = tx;
        });
    });
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
   * @param {number} pathIndex - the hop index of the path where the transaction is anchored
   * @returns {Promise<Operation>} The ICCF proof operation.
   */
  async function createIccfProofOperation(
    targetChainBrid: Buffer,
    pathIndex: number,
  ): Promise<Operation> {
    const decodedTx = gtx.deserialize(state.tx);

    const sourceBlockchainRid =
      pathIndex === 0
        ? session.client.config.blockchainRid
        : path[pathIndex - 1];

    const proofTx = await createIccfProofTx(
      directoryClient,
      getTransactionRID(state.tx),
      gtv.gtvHash(decodedTx),
      decodedTx.signers,
      sourceBlockchainRid.toString("hex"),
      targetChainBrid.toString("hex"),
    );

    return proofTx.iccfTx.operations[0];
  }

  /**
   * Execute the transfer operation across all steps.
   * @async
   * @returns {Promise<void>}
   */
  async function transfer(): Promise<void> {
    await handleErrors(async () => {
      await initTransfer();
      localEmitter.emit("TransferInit");
      await walkPath();
    });
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
      const orchError = new OrchestratorError(error.message, "generalError");
      localEmitter.emit("TransferError", orchError);
    }
  }

  /**
   * Accepts a cross chain transfer that was not completed
   * and resumes it. This function returns when the transfer
   * has been successfully completed.
   * @param transfer the transfer to resume
   */
  async function resumeTransfer(transfer: PendingTransfer) {
    state.tx = gtx.serialize(transfer.tx);
    state.initialTx = gtx.serialize(transfer.tx);
    for (let i = 0; i < state.path.length; i++) {
      if (
        await isAppliedOnBrid(
          formatter.ensureBuffer(state.path[i]),
          getTransactionRID(state.tx),
          transfer.opIndex,
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
      // Transfer already applied
      return;
    }

    await handleErrors(async () => {
      await walkPath(transfer);
    });
  }

  /**
   * Resumes all the provided transfers in parallell. This function
   * will not resulve until all the pending trnsfers has been applied
   * @param transfers the transfers to resume
   */
  async function resumeTransfers(transfers: PendingTransfer[]) {
    const promises = transfers.map((transfer) => resumeTransfer(transfer));
    await Promise.all(promises);
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
    return connection.query<boolean>(isTransferApplied(txBrid, opIndex));
  }

  async function walkPath(transfer?: PendingTransfer) {
    for (
      let pathIndex = state.currentHopIndex;
      pathIndex < path.length;
      pathIndex++
    ) {
      const targetBrid = path[pathIndex];
      await applyTransfer(targetBrid);

      state.currentHopIndex++;
      localEmitter.emit("TransferHop", targetBrid);
    }

    const targetChainBrid = path.slice(-1)[0];
    const tb = await getTransactionBuilderForChain(
      session,
      Buffer.from(session.client.config.blockchainRid, "hex"),
    );

    const iccfOp = await createIccfProofOperation(targetChainBrid, path.length);

    await new Promise<void>((resolve) => {
      tb.add(iccfOp)
        .add(
          deletePendingTransferOp(
            state.tx,
            getTransactionRID(state.initialTx),
            transfer?.opIndex || 1,
          ),
          () => {
            resolve();
          },
        )
        .buildAndSend();
    });

    localEmitter.emit("TransferEnd");
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

  const orchestrator = Object.freeze({
    transfer,
    resumeTransfer,
    resumeTransfers,
    eventEmitter: localEmitter,
    onTransferInit,
    offTransferInit,
    onTransferHop,
    offTransferHop,
    onTransferEnd,
    offTransferEnd,
    onTransferError,
    offTransferError,
  });

  return orchestrator;
}

import {
  IClient,
  IccfProof,
  Operation,
  SignedTransaction,
  createClient,
  createIccfProofTx,
  formatter,
  gtv,
  gtx,
} from "postchain-client";
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
import { createNoopAuthenticator } from "../authentication";
import { createAuthDataService } from "../ft-session";
import { Orchestrator, PendingTransfer } from "./types";
import { getTransactionRID } from "../utils";
import { isTransferApplied } from "./crosschain-queries";
import { deletePendingTransfer as deletePendingTransferOp } from "./crosschain-operations";

type State = {
  current: number;
  path: BufferId[];
  tx?: SignedTransaction;
  initialTx?: SignedTransaction;
};

function temporaryFixForIccfProof(proof: IccfProof) {
  const newTx = proof.iccfTx;
  newTx.operations[0].args[2] = gtv.encode(newTx.operations[0].args[2]);
  return newTx;
}

/**
 * Creates an orchestrator instance for managing cross-chain transfers.
 * @async
 * @param {BufferId} targetChainId - ID of the target blockchain.
 * @param {BufferId} recipientId - ID of the recipient.
 * @param {Amount} amount - The amount to be transferred.
 * @param {BufferId} assetId - ID of the asset to be transferred.
 * @param {Session} session - The current user session.
 * @returns {Orchestrator} The orchestrator instance with functionalities like initiating transfers,
 * subscribing/unsubscribing to various transfer events.
 */
export async function createOrchestrator(
  targetChainId: BufferId,
  recipientId: BufferId,
  amount: Amount,
  assetId: BufferId,
  session: Session,
): Promise<Orchestrator> {
  const asset = await session.getAssetById(assetId);

  const path = await findPathToChainForAsset(session, asset, targetChainId);
  const normalizedPath = path.map(formatter.ensureBuffer);

  // Create a local event emitter instance for this orchestrator.
  const localEmitter = new EventEmitter();

  const state: State = {
    current: 0,
    path: normalizedPath,
  };

  const directoryClient = await createClient({
    // TODO: Replace with directoryNodeURLPool after Postchain Client release
    nodeURLPool: session.client.config.endpointPool.slice(),
    // directoryNodeURLPool: session.client.config.endpointPool.slice(),
    blockchainIID: 0,
  });

  /**
   * Initialize the transfer by creating the initial transaction.
   * @returns {Promise<void>}
   */
  async function initTransfer(): Promise<void> {
    return new Promise((resolve) => {
      const tb = session.transactionBuilder();

      tb.add(initTransferOp(recipientId, assetId, amount, normalizedPath), () =>
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
   * @param {Buffer} targetChainBrid - The ID of the target bridge.
   * @returns {Promise<void>}
   */
  async function applyTransfer(
    targetChainBrid: Buffer,
    iccfOp: Operation,
  ): Promise<void> {
    const tb = await getTransactionBuilderForChain(session, targetChainBrid);

    return new Promise((resolve) => {
      tb.add(iccfOp)
        .add(
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
   * Execute the transfer operation across all steps.
   * @async
   * @returns {Promise<void>}
   */
  async function transfer(): Promise<void> {
    await handleErrors(async () => {
      await initTransfer();
      localEmitter.emit("TransferInit");

      await walkPath(directoryClient);
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
        state.current = i + 1;
        break;
      }
    }

    if (state.current > 0 && state.current === state.path.length - 1) {
      // Transfer already applied
      return;
    }

    await handleErrors(async () => {
      await walkPath(directoryClient, transfer);
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

  async function walkPath(
    directoryClient: IClient,
    transfer?: PendingTransfer,
  ) {
    async function createIccfOp(
      tx: SignedTransaction,
      targetBrid: Buffer,
      pathIndex: number,
    ) {
      const sourceBrid =
        pathIndex === 0
          ? session.client.config.blockchainRID
          : normalizedPath[pathIndex - 1];

      const decodedTx = gtx.deserialize(tx);
      const proofTx = await createIccfProofTx(
        directoryClient,
        getTransactionRID(tx),
        gtv.gtvHash(decodedTx),
        decodedTx.signers,
        sourceBrid.toString("hex"),
        targetBrid.toString("hex"),
      );

      // TODO: Replace with const { iccfTx } = proofTx
      const iccfTx = temporaryFixForIccfProof(proofTx);

      return iccfTx.operations[0];
    }
    for (
      let pathIndex = state.current;
      pathIndex < normalizedPath.length;
      pathIndex++
    ) {
      const targetBrid = normalizedPath[pathIndex];
      const iccfOp = await createIccfOp(state.tx, targetBrid, pathIndex);
      await applyTransfer(targetBrid, iccfOp);

      state.current++;
      localEmitter.emit("TransferHop", targetBrid);
    }

    const targetChainBrid = normalizedPath.slice(-1)[0];
    const tb = await getTransactionBuilderForChain(
      session,
      Buffer.from(session.client.config.blockchainRID, "hex"),
    );
    const iccfOp = await createIccfOp(
      state.tx,
      targetChainBrid,
      normalizedPath.length,
    );

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

  return {
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
  };
}

import {
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
import { Orchestrator } from "./types";
import { getTransactionRID } from "../utils";

type State = {
  current: number;
  path: BufferId[];
  tx?: SignedTransaction;
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
    const connection = await createConnectionToBrid(
      session.client,
      targetChainBrid,
    );

    return new Promise((resolve) => {
      const authDataService = createAuthDataService(connection);
      const noopAuthenticator = createNoopAuthenticator(authDataService);
      const tb = transactionBuilder(noopAuthenticator, connection.client);

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

  /**
   * Execute the transfer operation across all steps.
   * @async
   * @returns {Promise<void>}
   */
  async function transfer(): Promise<void> {
    const directoryClient = await createClient({
      directoryNodeURLPool: session.client.config.endpointPool.slice(),
      blockchainRID:
        "261D95F368B3143411BE87083C99FB51D6C5D4A1293AB1CEC39C9080AE79E38B",
      // blockchainIID: 0,
    });

    try {
      localEmitter.emit("TransferInit");
      await initTransfer();

      for (
        let pathIndex = state.current;
        pathIndex < normalizedPath.length;
        pathIndex++
      ) {
        const brid = normalizedPath[pathIndex];

        const decodedTx = gtx.deserialize(state.tx);

        const sourceBlockchainRid =
          pathIndex === 0
            ? session.client.config.blockchainRID
            : normalizedPath[pathIndex - 1];

        const proofTx = await createIccfProofTx(
          directoryClient,
          getTransactionRID(state.tx),
          gtv.gtvHash(decodedTx),
          decodedTx.signers,
          sourceBlockchainRid.toString("hex"),
          brid.toString("hex"),
        );

        // TODO: Replace with const { iccfTx } = proofTx
        const iccfTx = temporaryFixForIccfProof(proofTx);

        const iccfOp = iccfTx.operations[0];
        await applyTransfer(brid, iccfOp);

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

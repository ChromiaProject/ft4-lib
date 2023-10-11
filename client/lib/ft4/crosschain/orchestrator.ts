import {
  IClient,
  SignedTransaction,
  createClient,
  createIccfProofTx,
  gtv,
  gtx,
} from "postchain-client";
import { BufferId } from "/cryptoUtils";
import { Amount } from "../asset/interfaces";
import { createConnectionToBrid, findPathToChainForAsset } from "./pathfinder";
import { Listener, EventEmitter } from "../events";
import {
  FactoryError,
  OrchestratorError,
  TransferExecutionError,
} from "./errors";
import {
  initTransfer as initTransferOp,
  applyTransfer as applyTransferOp,
} from "./operations";
import { Session } from "../types";
import { transactionBuilder } from "../utils/transaction-builder";
import { createNoopAuthenticator } from "../authentication";
import { createAuthDataService } from "../ft-session";
import { Orchestrator, OrchestratorEvents } from "./types";
import { getTransactionRID } from "../utils";

type State = {
  currentHopIndex: number;
  path: Buffer[];
  tx?: SignedTransaction;
};

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
  assetId: BufferId,
  amount: Amount,
  session: Session,
): Promise<Orchestrator> {
  const asset = await session.getAssetById(assetId);
  if (asset === null) {
    throw new FactoryError("Asset not found");
  }

  let path: Buffer[];

  try {
    path = await findPathToChainForAsset(session, asset, targetChainId);
  } catch (error) {
    throw new FactoryError(`Path finder error: ${error.message}`);
  }

  // Create a local event emitter instance for this orchestrator.
  const localEmitter = new EventEmitter<OrchestratorEvents>();

  const state: State = {
    currentHopIndex: 0,
    path,
  };

  /**
   * Initialize the transfer by creating the initial transaction.
   * @returns {Promise<void>}
   */
  async function initTransfer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tb = session.transactionBuilder();

      tb.add(initTransferOp(recipientId, assetId, amount, path), () =>
        resolve(),
      )
        .buildAndSend()
        .then(
          ({ tx }) => {
            state.tx = tx;
          },
          (reason) => {
            reject(`Failed to initialize transfer: ${reason}`);
          },
        );
    });
  }

  /**
   * Apply the transfer operation targeting a specific bridge.
   * @param {IClient} directoryClient - The client for the directory chain.
   * @param {Buffer} targetChainBrid - The ID of the target bridge.
   * @returns {Promise<void>}
   */
  async function applyTransfer(
    directoryClient: IClient,
    targetChainBrid: Buffer,
  ): Promise<void> {
    const connection = await createConnectionToBrid(
      session.client,
      targetChainBrid,
    );

    const { iccfTx } = await createIccfProof(directoryClient, targetChainBrid);
    const iccfOp = iccfTx.operations[0];

    return new Promise((resolve, reject) => {
      const authDataService = createAuthDataService(connection);
      const noopAuthenticator = createNoopAuthenticator(authDataService);
      const tb = transactionBuilder(noopAuthenticator, connection.client);

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
        .then(
          ({ tx }) => {
            state.tx = tx;
          },
          (reason) => {
            reject(`Failed to apply transfer: ${reason}`);
          },
        );
    });
  }

  /**
   * Create ICCF proof for a specific bridge.
   *
   * @param {any} directoryClient - The client for the directory service.
   * @param {Buffer} targetChainBrid - The ID of the target bridge.
   * @returns {Promise<IccfProof>} The ICCF proof transaction.
   */
  async function createIccfProof(
    directoryClient: IClient,
    targetChainBrid: Buffer,
  ): Promise<any> {
    const pathIndex = path.indexOf(targetChainBrid);
    const decodedTx = gtx.deserialize(state.tx);

    const sourceBlockchainRid =
      pathIndex === 0
        ? session.client.config.blockchainRID
        : path[pathIndex - 1];

    const proofTx = createIccfProofTx(
      directoryClient,
      getTransactionRID(state.tx),
      gtv.gtvHash(decodedTx),
      decodedTx.signers,
      sourceBlockchainRid.toString("hex"),
      targetChainBrid.toString("hex"),
    );

    return proofTx;
  }

  /**
   * Execute the transfer operation across all steps.
   * @async
   * @returns {Promise<void>}
   */
  async function transfer(): Promise<void> {
    const directoryClient = await createClient({
      directoryNodeURLPool: session.client.config.endpointPool.slice(),
      blockchainIID: 0,
    });

    try {
      localEmitter.emit("TransferInit");

      await initTransfer();

      for (
        let pathIndex = state.currentHopIndex;
        pathIndex < path.length;
        pathIndex++
      ) {
        const brid = path[pathIndex];

        await applyTransfer(directoryClient, brid);

        state.currentHopIndex++;
        localEmitter.emit("TransferHop", brid);
      }

      localEmitter.emit("TransferEnd");
    } catch (error) {
      const orchError = new TransferExecutionError(error.message);
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

  const orchestrator = Object.freeze({
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
  });

  return orchestrator;
}

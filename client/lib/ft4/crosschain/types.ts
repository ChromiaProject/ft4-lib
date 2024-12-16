import { Asset, AssetResponse } from "@ft4/asset";
import { EventEmitter, Listener } from "@ft4/events";
import { BufferId } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  Operation,
  RawGtx,
  SignedTransaction,
  TransactionReceipt,
} from "postchain-client";

export type GtvInitTransferArgs = [
  receiverId: Buffer,
  assetId: Buffer,
  amount: bigint,
  hops: Buffer[],
  deadline: number,
];

export type OrchestratorEvents = {
  TransferSigned: [SignedTransaction];
  TransferInit: [TransactionReceipt];
  TransferHop: [BufferId];
};

export type OrchestratorState = {
  currentHopIndex: number;
  path: Buffer[];
  tx?: RawGtx;
  opIndex?: number;
  initialTx?: RawGtx;
  initialOpIndex?: number;
};

/**
 * Basic functions that is used by all different Orchestrator types
 */
export interface OrchestratorBase {
  state: OrchestratorState;
  eventEmitter: EventEmitter<OrchestratorEvents>;
  /**
   * Applies a crosschain transaction to each intermediary chain between initial and target chain
   */
  walkPath: () => Promise<void>;
  /**
   * Completes a crosschain transfer by applying the transaction on the target chain
   * @param tx - the transaction to apply on the target chain
   * @param opIndex - the index at which the transfer operation to apply is located in the transaction
   */
  performCompleteTransfer: (tx: RawGtx, opIndex: number) => Promise<void>;
  /**
   * Creates a proof that the latest transaction hop was applied to the target chain
   * @param targetChainRid - the rid of the blockchain that is to validate the proof
   * @param hopIndex - the index at which the operation to create the proof for can be found
   * @returns the proof operation
   */
  createIccfProofOperation: (
    targetChainRid: Buffer,
    hopIndex: number,
  ) => Promise<Operation>;
  /**
   * Registers a listener that gets invoked when the transaction is signed
   * @param listener - the listener to register
   */
  onTransferSigned: (listener: Listener<[SignedTransaction]>) => void;
  /**
   * De-registers a listener that was previously registered for receiving events when transfer were signed
   * @param listener - the listener to remove
   */
  offTransferSigned: (listener: Listener<[SignedTransaction]>) => void;
  /**
   * Registers a listener that gets invoked when init transfer has been successfully submitted
   * @param listener - the listener to register
   */
  onTransferInit: (listener: Listener<[TransactionReceipt]>) => void;
  /**
   * De-registers a listener that was previously registered for receiving events when init transfer has been successfully submitted
   * @param listener - the listener to remove
   */
  offTransferInit: (listener: Listener<[TransactionReceipt]>) => void;
  /**
   * Registers a listener that gets invoked when a transfer hop is successfully completed
   * @param listener - the listener to register
   */
  onTransferHop: (listener: Listener<[BufferId]>) => void;
  /**
   * De-registers a listener that was previously registered for receiving events when a transfer hop is successfully completed
   * @param listener - the listener to remove
   */
  offTransferHop: (listener: Listener<[BufferId]>) => void;
}

export type ExternalOrchestratorBase = Omit<
  OrchestratorBase,
  "state" | "walkPath" | "performCompleteTransfer" | "createIccfProofOperation"
>;

export type Orchestrator = ExternalOrchestratorBase & {
  /**
   * Performs the transfer with the information that this Orchestrator was created with
   * @returns a reference to the performed transfer
   */
  transfer: () => Promise<TransferRef>;
};

export type ResumeOrchestrator = ExternalOrchestratorBase & {
  /**
   * Resumes the transfer with the information that this Orchestrator was created with
   */
  resumeTransfer: () => Promise<void>;
};

export type RevertOrchestrator = ExternalOrchestratorBase & {
  /**
   * Reverts a transfer that was initiated but which did not reach its destination within the timeout period
   */
  revertTransfer: () => Promise<void>;

  /**
   * Recall a transfer which reached the target chain, but which was not claimed by the recipient within the timeout period
   */
  recallUnclaimedTransfer: () => Promise<void>;
};

export type TransferRef = {
  tx: RawGtx;
  opIndex: number;
};

export type PendingTransfer = {
  tx: RawGtx;
  opIndex: number;
  accountId: Buffer;
};

export type PendingTransferResponse = {
  tx_data: Buffer;
  op_index: number;
  account_id: Buffer;
};

export type AssetOriginFilter = {
  rowids: Array<number>;
  assetId?: Buffer | null;
};

export type TransferFilter = {
  rowids: Array<number>;
  initTxRid?: Buffer | null;
  initOpIndex?: number | null;
};

export type PendingTransferFilter = {
  rowids: Array<number>;
  transactionId?: Buffer | null;
  initOpIndex?: number | null;
  senderAccountId?: Buffer | null;
};

export type AssetOriginResponse = {
  rowid: number;
  asset: AssetResponse;
  origin_blockchain_rid: Buffer;
};

export type AssetOrigin = {
  rowId: number;
  asset: Asset;
  originBlockchainRid: Buffer;
};

export type AppliedTransferResponse = {
  rowid: number;
  init_tx_rid: Buffer;
  init_op_index: number;
  transaction_rid: Buffer;
  op_index: number;
};

export type AppliedTransfer = {
  rowId: number;
  initTxRid: Buffer;
  initOpIndex: number;
  transactionId: Buffer;
  opIndex: number;
};

export type TransferResponse = {
  rowid: number;
  init_tx_rid: Buffer;
  init_op_index: number;
};

export type Transfer = {
  rowId: number;
  initTxRid: Buffer;
  initOpIndex: number;
};

// Todo fix name as it already exists
export type PendingTransferResponse_ = {
  rowid: number;
  transaction_rid: Buffer;
  op_index: number;
  sender_account_id: Buffer;
};

// Todo fix name as it already exists
export type PendingTransfer_ = {
  rowId: number;
  transactionId: Buffer;
  opIndex: number;
  senderAccountId: Buffer;
};

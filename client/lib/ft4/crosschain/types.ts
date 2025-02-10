import { AccountResponse } from "@ft4/accounts";
import { Asset, AssetResponse } from "@ft4/asset";
import { EventEmitter, Listener } from "@ft4/events";
import { Buffer } from "buffer";
import {
  BufferId,
  GTX,
  Operation,
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
  /** the index in `path` where the next transaction is supposed to go */
  nextHopIndex: number;
  tx: GTX;
  opIndex: number;
  /**
   * A function that returns a promise of an operation
   * @param brid - the brid of the chain to get the proof for
   * @returns a promise of an operation that is a system confirmation proof
   */
  systemConfirmationProof: (brid: Buffer) => Promise<Operation>;
};

export type OrchestratorData = {
  path: Buffer[];
  initialTx: GTX;
  initialOpIndex: number;
};

export type OrchestratorEventHandler = {
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
};

/**
 * Basic functions that is used by all different Orchestrator types
 */
export type OrchestratorCore = OrchestratorEventHandler & {
  state: OrchestratorState;
  initialData: OrchestratorData;
  eventEmitter: EventEmitter<OrchestratorEvents>;
  /**
   * Applies a crosschain transaction to each intermediary chain between initial (exclusive) and target chain (inclusive)
   */
  performAllApplyTransfers: () => Promise<void>;
  /**
   * Completes a crosschain transfer by applying the transaction on the target chain
   * @param tx - the transaction to apply on the target chain
   * @param opIndex - the index at which the transfer operation to apply is located in the transaction
   */
  performCompleteTransfer: (tx: GTX, opIndex: number) => Promise<void>;
};

export type Orchestrator = OrchestratorEventHandler & {
  /**
   * Performs the transfer with the information that this Orchestrator was created with
   * @returns a reference to the performed transfer
   */
  transfer: () => Promise<TransferRef>;
};

export type ResumeOrchestrator = OrchestratorEventHandler & {
  /**
   * Resumes the transfer with the information that this Orchestrator was created with
   */
  resumeTransfer: () => Promise<void>;
};

export type RevertOrchestrator = OrchestratorEventHandler & {
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
  tx: GTX;
  opIndex: number;
};

export type PendingTransfer = {
  tx: GTX;
  opIndex: number;
  senderAccount: AccountResponse;
};

export type PendingTransferResponse = {
  tx_data: Buffer;
  op_index: number;
  sender_account: AccountResponse;
};

export type AssetOriginFilter = Partial<{
  assetIds?: Array<Buffer> | null;
}> | null;

export type TransferFilter = Partial<{
  initTxRids?: Array<Buffer> | null;
  initOpIndex?: number | null;
}> | null;

export type PendingTransferFilter = Partial<{
  transactionIds?: Array<Buffer> | null;
  initOpIndex?: number | null;
  senderAccountId?: Buffer | null;
}> | null;

export type AssetOriginResponse = {
  asset: AssetResponse;
  origin_blockchain_rid: Buffer;
};

export type AssetOrigin = {
  asset: Asset;
  originBlockchainRid: Buffer;
};

export type AppliedTransferResponse = {
  init_tx_rid: Buffer;
  init_op_index: number;
  transaction_rid: Buffer;
  op_index: number;
};

export type AppliedTransfer = {
  initTxRid: Buffer;
  initOpIndex: number;
  transactionId: Buffer;
  opIndex: number;
};

export type TransferResponse = {
  init_tx_rid: Buffer;
  init_op_index: number;
};

export type Transfer = {
  initTxRid: Buffer;
  initOpIndex: number;
};

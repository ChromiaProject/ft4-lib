import { AccountResponse } from "@ft4/accounts";
import { Asset, AssetResponse } from "@ft4/asset";
import { EventEmitter, Listener } from "@ft4/events";
import {
  GTX,
  Operation,
  SignedTransaction,
  TransactionReceipt,
} from "postchain-client";

export const NO_TRANSACTION_RID = Buffer.alloc(0);
export const NO_OP_INDEX = -1;

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
  TransferHop: [HopData];
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

export type HopData = {
  brid: Buffer;
  txRid: Buffer;
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
  onTransferHop: (listener: Listener<[HopData]>) => void;
  /**
   * De-registers a listener that was previously registered for receiving events when a transfer hop is successfully completed
   * @param listener - the listener to remove
   */
  offTransferHop: (listener: Listener<[HopData]>) => void;
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
  transaction_rid?: Buffer;
  op_index?: number;
};

export type Transfer = {
  initTxRid: Buffer;
  initOpIndex: number;
  transactionRid?: Buffer;
  opIndex?: number;
};

/**
 * Events emitted by the `solvePendingCrosschainTransfer` function
 */
export type SolveTransferEvents = {
  /**
   * Emitted when the transfer is found
   */
  found: Buffer;
  /**
   * Emitted when the transfer is evaluated
   */
  evaluated: EvaluationResult;
  /**
   * Emitted when a transfer hop is successfully completed
   */
  hop: HopData;
};

/**
 * Result of the evaluation of a transfer
 */
export type EvaluationResult = {
  /**
   * Whether the transfer has expired
   */
  expired: boolean;
  /**
   * Whether the transfer has reached the target chain
   */
  reachedTargetChain: boolean;
  /**
   * Whether the transfer has been claimed
   */
  claimed: boolean;
  /**
   * Whether the target account exists. If false, the user was trying to register
   * an account with this transfer.
   */
  targetAccountExists: boolean;
  /**
   * Whether the funds must return to the sender.
   * If this is false, the transfer can still reach the target chain.
   */
  fundsMustReturnToSender: boolean;
};

/**
 * The result of calling {@link isUnclaimedTransfer}.
 * It will work on any completed crosschain transfer, regardless of whether it
 * was meant to create an account.
 */
export enum UnclaimedTransferStatus {
  /**
   * The transfer must be recalled because it has expired, and the account doesn't exist.
   */
  MustBeRecalled,
  /**
   * The transfer must be claimed by the recipient, and it cannot yet be recalled.
   */
  MustBeClaimed,
  /**
   * The transfer has reached the destination account, or it wasn't an account creation transfer
   * in the first place.
   */
  IsDone,
}

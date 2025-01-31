import { AccountResponse } from "@ft4/accounts";
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

// Similar as below, but it would be needed to decide if we return from rell the whole transaction or the txrid
// which would be also the case for the type PendingTransferResponse, in order to unify them
export type PendingTransferResponse_ = {
  transaction_rid: Buffer;
  op_index: number;
  sender_account: AccountResponse;
};

// Similar type as PendingTransfer, the difference is that PendingTransfer transaction RawGtx is used in existing functions
// and a unification of the types would make no sense. Possibly the transactionId and transaction (tx) could be unified
// receiving a proper type of Transaction from Postchain client with a refactor in the uses of PendingTransfer
export type PendingTransfer_ = {
  transactionId: Buffer;
  opIndex: number;
  senderAccount: AccountResponse;
};

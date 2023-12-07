import { Buffer } from "buffer";
import { Operation, RawGtx } from "postchain-client";
import { EventEmitter, Listener } from "../events";
import { OrchestratorError } from "./errors";
import { TransactionBuilder } from "../utils/transaction-builder";
import { Session } from "../types";
import { BufferId } from "/ft4/utils/types";

export type GtvInitTransferArgs = [
  receiverId: Buffer,
  assetId: Buffer,
  amount: bigint,
  hops: Buffer[],
];

export type OrchestratorEvents = {
  TransferInit: [];
  TransferHop: [BufferId];
  TransferComplete: [];
  TransferError: [OrchestratorError];
};

export type OrchestratorState = {
  currentHopIndex: number;
  path: Buffer[];
  tx?: RawGtx;
  initialTx?: RawGtx;
};

export interface OrchestratorBase {
  state: OrchestratorState;
  eventEmitter: EventEmitter<OrchestratorEvents>;
  walkPath: () => Promise<void>;
  getTransactionBuilderForChain: (
    session: Session,
    brid: Buffer,
  ) => Promise<TransactionBuilder>;
  handleErrors: (fn: () => Promise<void>) => Promise<void>;
  completeTransfer: (tx: RawGtx, transfer?: PendingTransfer) => Promise<void>;
  createIccfProofOperation: (
    targetChainBrid: Buffer,
    hopIndex: number,
  ) => Promise<Operation>;
  onTransferInit: (listener: Listener<[]>) => void;
  offTransferInit: (listener: Listener<[]>) => void;
  onTransferHop: (listener: Listener<[BufferId]>) => void;
  offTransferHop: (listener: Listener<[BufferId]>) => void;
  onTransferComplete: (listener: Listener<[]>) => void;
  offTransferComplete: (listener: Listener<[]>) => void;
  onTransferError: (listener: Listener<[OrchestratorError]>) => void;
  offTransferError: (listener: Listener<[OrchestratorError]>) => void;
}

export type ExternalOrchestratorBase = Omit<
  OrchestratorBase,
  | "state"
  | "walkPath"
  | "getTransactionBuilderForChain"
  | "handleErrors"
  | "completeTransfer"
  | "createIccfProofOperation"
>;

export type Orchestrator = ExternalOrchestratorBase & {
  transfer: () => Promise<void>;
};

export type ResumeOrchestrator = ExternalOrchestratorBase & {
  resumeTransfer: () => Promise<void>;
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

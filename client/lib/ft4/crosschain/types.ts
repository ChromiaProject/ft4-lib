import { Buffer } from "buffer";
import { Operation, RawGtx } from "postchain-client";
import { EventEmitter, Listener } from "../events";
import { OrchestratorError } from "./errors";
import { BufferId } from "/cryptoUtils";
import { TransactionBuilder } from "../utils/transaction-builder";
import { Session } from "../types";

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

type OrchestratorState = {
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
  endTransfer: (tx: RawGtx, transfer?: PendingTransfer) => Promise<void>;
  createIccfProofOperation: (
    targetChainBrid: Buffer,
    hopIndex: number,
  ) => Promise<Operation>;
  onTransferInit: (listener: Listener<[]>) => void;
  offTransferInit: (listener: Listener<[]>) => void;
  onTransferHop: (listener: Listener<[BufferId]>) => void;
  offTransferHop: (listener: Listener<[BufferId]>) => void;
  onTransferEnd: (listener: Listener<[]>) => void;
  offTransferEnd: (listener: Listener<[]>) => void;
  onTransferError: (listener: Listener<[OrchestratorError]>) => void;
  offTransferError: (listener: Listener<[OrchestratorError]>) => void;
}

export type Orchestrator = Omit<OrchestratorBase, "state"> & {
  transfer: () => Promise<void>;
};

export type ResumeOrchestrator = Omit<OrchestratorBase, "state"> & {
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

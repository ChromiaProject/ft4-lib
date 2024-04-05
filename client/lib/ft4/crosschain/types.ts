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

export interface OrchestratorBase {
  state: OrchestratorState;
  eventEmitter: EventEmitter<OrchestratorEvents>;
  walkPath: () => Promise<void>;
  performCompleteTransfer: (tx: RawGtx, opIndex: number) => Promise<void>;
  createIccfProofOperation: (
    targetChainRid: Buffer,
    hopIndex: number,
  ) => Promise<Operation>;
  onTransferSigned: (listener: Listener<[SignedTransaction]>) => void;
  offTransferSigned: (listener: Listener<[SignedTransaction]>) => void;
  onTransferInit: (listener: Listener<[TransactionReceipt]>) => void;
  offTransferInit: (listener: Listener<[TransactionReceipt]>) => void;
  onTransferHop: (listener: Listener<[BufferId]>) => void;
  offTransferHop: (listener: Listener<[BufferId]>) => void;
}

export type ExternalOrchestratorBase = Omit<
  OrchestratorBase,
  "state" | "walkPath" | "performCompleteTransfer" | "createIccfProofOperation"
>;

export type Orchestrator = ExternalOrchestratorBase & {
  transfer: () => Promise<void>;
};

export type ResumeOrchestrator = ExternalOrchestratorBase & {
  resumeTransfer: () => Promise<void>;
};

export type RevertOrchestrator = ExternalOrchestratorBase & {
  revertTransfer: () => Promise<void>;
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

import { Buffer } from "buffer";
import { RawGtx } from "postchain-client";
import { EventEmitter, Listener } from "../events";
import { OrchestratorError } from "./errors";
import { BufferId } from "/cryptoUtils";

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

export interface Orchestrator {
  transfer: () => Promise<void>;
  resumeTransfer: (transfer: PendingTransfer) => Promise<void>;
  resumeTransfers: (transfers: PendingTransfer[]) => Promise<void>;
  eventEmitter: EventEmitter<OrchestratorEvents>;
  onTransferInit: (listener: Listener<[]>) => void;
  offTransferInit: (listener: Listener<[]>) => void;
  onTransferHop: (listener: Listener<[BufferId]>) => void;
  offTransferHop: (listener: Listener<[BufferId]>) => void;
  onTransferEnd: (listener: Listener<[]>) => void;
  offTransferEnd: (listener: Listener<[]>) => void;
  onTransferError: (listener: Listener<[OrchestratorError]>) => void;
  offTransferError: (listener: Listener<[OrchestratorError]>) => void;
}

export type PendingTransfer = {
  tx: RawGtx;
  opIndex: number;
  accountId: Buffer;
};

export type PendingTransferResponse = {
  tx_data: RawGtx;
  op_index: number;
  account_id: Buffer;
};

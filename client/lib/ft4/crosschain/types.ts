import { Buffer } from "buffer";
import { GTX, RawGtv } from "postchain-client";
import { EventEmitter, Listener } from "../events";
import { FTEvents } from "../events/types";
import { OrchestratorError } from "./errors";
import { BufferId } from "/cryptoUtils";

type GtxOperation = {
  name: string;
  args: RawGtv[];
};

type GtxTransactionBody = {
  blockchain_rid: Buffer;
  operations: GtxOperation[];
  signers: Buffer[];
};

export type GtxTransaction = {
  body: GtxTransactionBody;
  signatures: Buffer[];
};

export type InitTransferArgs = [
  receiverId: Buffer,
  assetId: Buffer,
  amount: bigint,
  hops: Buffer[],
];

export interface Orchestrator {
  transfer: () => Promise<void>;
  resumeTransfer: (transfer: PendingTransfer) => Promise<void>;
  resumeTransfers: (transfers: PendingTransfer[]) => Promise<void>;
  eventEmitter: EventEmitter<FTEvents>;
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
  tx: GTX;
  opIndex: number;
  accountId: Buffer;
};

export type PendingTransferResponse = {
  tx_data: Buffer;
  op_index: number;
  account_id: Buffer;
};

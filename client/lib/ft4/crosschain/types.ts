import { RawGtv } from "postchain-client";
import { Buffer } from "buffer";
import { EventEmitter, Listener } from "../events";
import { OrchestratorError } from "./errors";
import { BufferId } from "/cryptoUtils";
import { FTEvents } from "../events/types";

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
  txRid: Buffer;
  opIndex: number;
  accountId: Buffer;
};

export type PendingTransferResponse = {
  tx_rid: Buffer;
  op_index: number;
  account_id: Buffer;
};

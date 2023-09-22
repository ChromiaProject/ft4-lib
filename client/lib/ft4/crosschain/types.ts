import { Buffer } from "buffer";
import { EventEmitter, Listener } from "../events";
import { OrchestratorError } from "./errors";
import { BufferId } from "/cryptoUtils";
import { FTEvents } from "../events/types";

export type GtvInitTransferArgs = [
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

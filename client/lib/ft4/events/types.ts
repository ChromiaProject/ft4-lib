import { KeyStore } from "../authentication";
import { OrchestratorError } from "../crosschain/errors";
import { BufferId } from "/cryptoUtils";

export type Listener<T extends any[]> = (...args: T) => void;

export type FTEvents = {
  // Define other events here as arrays of their argument types.
  NoOp: [string];
  KeyStoreChange: [KeyStore];
  TransferInit: [];
  TransferHop: [BufferId];
  TransferEnd: [];
  TransferError: [OrchestratorError];
};

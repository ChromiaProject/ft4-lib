import { KeyStore } from "../authentication";

export type Listener<T extends any[]> = (...args: T) => void;

export type FTEvents = {
  // Define other events here as arrays of their argument types.
  NoOp: [string];
  KeyStoreChange: [KeyStore];
};

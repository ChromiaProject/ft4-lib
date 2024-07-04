import { KeyStore } from "@ft4/authentication";

/**
 * A callback function that can be passed to an event emitter to be invoked upon events
 */
export type Listener<T extends any[]> = (...args: T) => void;

export type FTEvents = {
  // Define other events here as arrays of their argument types.
  NoOp: [string];
  KeyStoreChange: [KeyStore | null];
};

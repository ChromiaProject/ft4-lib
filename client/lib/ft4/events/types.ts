import { KeyStore } from "../authentication";

export type Listener<T = any> = (...args: T[]) => void;

export type FTEvents = {
  AccountAddressChange: [string];
  // Define other events here as arrays of their argument types.
  KeyStoreChanged: [KeyStore];
};

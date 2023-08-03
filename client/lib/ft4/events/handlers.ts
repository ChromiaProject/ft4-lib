import { ftEventEmitter } from "./ftEventEmitter";
import { Listener } from "./types";

/**
 * Registers a listener for the AccountAddressChange event.
 * @param listener The listener to register.
 * @returns A function that removes the listener when called.
 */
export function onAccountAddressChange(listener: Listener<[string]>) {
  if (typeof listener !== "function") {
    throw new Error("Listener must be a function");
  }

  return ftEventEmitter.on("AccountAddressChange", listener);
}

/**
 * Removes a listener for the AccountAddressChange event.
 * @param listener The listener to remove.
 */
export function offAccountAddressChange(listener: Listener<[string]>) {
  ftEventEmitter.off("AccountAddressChange", listener);
}

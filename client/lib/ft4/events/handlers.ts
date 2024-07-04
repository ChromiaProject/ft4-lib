import { ftEventEmitter } from "./ftEventEmitter";
import { Listener } from "./types";

// Registers a listener for the NoOp event.
export function onNoOp(listener: Listener<[string]>) {
  if (typeof listener !== "function") {
    throw new Error("Listener must be a function");
  }

  return ftEventEmitter.on("NoOp", listener);
}

// Removes a listener for the NoOp event.
export function offNoOp(listener: Listener<[string]>) {
  ftEventEmitter.off("NoOp", listener);
}

/**
 * Groups noOp event handlers
 */
export interface EventHandlers {
  /**
   * Adds a listener that is invoked when a NoOp event is emitted
   * @param listener - listener to add
   */
  onNoOp(listener: Listener<[string]>): void;
  /**
   * Removes a listener that was added for receiving NoOp-events
   * @param listener - listener to add
   */
  offNoOp(listener: Listener<[string]>): void;
}

export const eventHandlers: EventHandlers = {
  onNoOp,
  offNoOp,
};

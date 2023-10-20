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

export const EventHandlers = {
  onNoOp,
  offNoOp,
};

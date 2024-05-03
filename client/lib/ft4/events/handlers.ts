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

export interface EventHandlers {
  onNoOp(listener: Listener<[string]>): void;
  offNoOp(listener: Listener<[string]>): void;
}

export const eventHandlers: EventHandlers = {
  onNoOp,
  offNoOp,
};

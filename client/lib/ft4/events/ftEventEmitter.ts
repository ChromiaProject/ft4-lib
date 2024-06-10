import { EventEmitter } from "./emitter";
import { FTEvents } from "./types";

/**
 * Special case of the EventEmitter which is configured to emit events
 * defined in {@link events.FTEvents}
 */
export class FTEventEmitter extends EventEmitter<FTEvents> {}

export const ftEventEmitter = new FTEventEmitter();

import { EventEmitter } from "./emitter";
import { FTEvents } from "./types";

export class FTEventEmitter extends EventEmitter<FTEvents> {}

export const ftEventEmitter = new FTEventEmitter();

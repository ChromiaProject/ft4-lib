import { EventEmitter } from "events";

interface FTEvents {
  addressChange: (address: string) => void;

  // TODO: Define other events here...
}

export class FTEventEmitter extends EventEmitter {
  constructor() {
    super();
  }
  emit<K extends keyof FTEvents>(
    event: K,
    ...args: Parameters<FTEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof FTEvents>(event: K, listener: FTEvents[K]): this {
    return super.on(event, listener);
  }
}

export const ftEventEmitter = new FTEventEmitter();

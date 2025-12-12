/**
 * An error that occurs in an event emitter listener.
 * This error wraps the original error that occurred during event handling.
 */
export class EventEmitterError extends Error {
  originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    if (originalError) {
      this.originalError = originalError;
    }
  }
}

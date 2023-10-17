export class OrchestratorError extends Error {
  originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.originalError = originalError;
  }
}

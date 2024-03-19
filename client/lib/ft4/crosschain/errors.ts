export class OrchestratorError extends Error {
  originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    if (originalError) {
      this.originalError = originalError;
    }
  }
}

export class FactoryError extends OrchestratorError {}

export class TransferExecutionError extends OrchestratorError {}

export class InitTransferError extends TransferExecutionError {}

export class ApplyTransferError extends TransferExecutionError {}

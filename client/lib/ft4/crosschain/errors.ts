/**
 * Umbrella error, thrown to indicate that something went wrong
 * when the orchestrator was trying to perform a task.
 */
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

/**
 * Thrown when a specific Orchestrator could not be instantiated
 */
export class FactoryError extends OrchestratorError {}

/**
 * Thrown if something went wrong when executing a transfer
 */
export class TransferExecutionError extends OrchestratorError {}

/**
 * Thrown if something went wrong when calling init transfer
 */
export class InitTransferError extends TransferExecutionError {}

/**
 * Thrown if something went wrong when calling apply transfer
 */
export class ApplyTransferError extends TransferExecutionError {}

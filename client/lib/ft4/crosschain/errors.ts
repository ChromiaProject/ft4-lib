export const ErrorMessages = {
  ASSET_NOT_FOUND: "The specified asset could not be found",
  FAILED_TO_FIND_PATH:
    "Failed to find a path to the target chain for the specified asset",
  UNABLE_TO_FETCH_PROOF: "Unable to fetch proof",
  FAILED_TO_SEND_TRANSACTION: "Failed to send transaction",
};

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

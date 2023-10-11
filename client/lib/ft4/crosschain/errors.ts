export class OrchestratorError extends Error {
  type: string;

  constructor(message: string, type: string) {
    super(message);
    this.type = type;
  }
}

export class FactoryError extends OrchestratorError {
  constructor(message: string) {
    super(message, "FactoryError");
  }
}

export class TransferExecutionError extends OrchestratorError {
  constructor(message: string) {
    super(message, "TransferError");
  }
}

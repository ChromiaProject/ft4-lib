export class OrchestratorError extends Error {
  type: string;

  constructor(message: string, type = "OrchestratorError") {
    super(message);
    this.type = type;
  }
}

export class OperationNotExistError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "OperationNotExistError";
  }
}

export class OperationNotExistError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "OperationNotExistError";
  }
}

export class FetchAppStructureError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "FetchAppStructureError";
  }
}

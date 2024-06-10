/**
 * Thrown to indicate that the user is trying to call an
 * operation that does not exist.
 */
export class OperationNotExistError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "OperationNotExistError";
  }
}

/**
 * Thrown to indicate that the application failed to fetch the app structure.
 */
export class FetchAppStructureError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "FetchAppStructureError";
  }
}

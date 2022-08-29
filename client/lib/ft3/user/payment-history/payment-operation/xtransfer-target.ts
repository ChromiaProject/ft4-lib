import { ensureBuffer, Id } from "../../../../cyptoUtils";

export default class XTransferTarget {
  readonly accountId: Buffer;

  constructor(accountId: Id) {
    this.accountId = ensureBuffer(accountId);
  }
}

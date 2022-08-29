import { ensureBuffer, Id } from "../../../../cryptoUtils";

export default class XTransferTarget {
  readonly accountId: Buffer;

  constructor(accountId: Id) {
    this.accountId = ensureBuffer(accountId);
  }
}

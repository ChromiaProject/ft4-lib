import { ensureBuffer, BufferId } from "../../../../cryptoUtils";

export default class XTransferTarget {
  readonly accountId: Buffer;

  constructor(accountId: BufferId) {
    this.accountId = ensureBuffer(accountId);
  }
}

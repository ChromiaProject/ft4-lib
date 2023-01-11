import { formatter } from "postchain-client";
import { BufferId } from "../../../../cryptoUtils";

export default class XTransferTarget {
  readonly accountId: Buffer;

  constructor(accountId: BufferId) {
    this.accountId = formatter.ensureBuffer(accountId);
  }
}

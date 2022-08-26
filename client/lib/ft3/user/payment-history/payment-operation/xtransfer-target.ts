import { ensureBuffer } from "../../../../cyptoUtils";

export default class XTransferTarget {
  readonly accountId: Buffer;

  constructor(accountId: string | Buffer) {
    this.accountId = ensureBuffer(accountId);
  }
}

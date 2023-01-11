import { formatter } from "postchain-client";
import { BufferId } from "../../../../cryptoUtils";

export default class TransferParam {
  readonly accountId: Buffer;
  readonly assetId: Buffer;
  readonly amount: number;

  constructor(accountId: BufferId, assetId: BufferId, amount: number) {
    this.accountId = formatter.ensureBuffer(accountId);
    this.assetId = formatter.ensureBuffer(assetId);
    this.amount = amount;
  }

  isAccountId(accountId: BufferId): boolean {
    return this.accountId.compare(formatter.ensureBuffer(accountId)) === 0;
  }

  isAssetId(assetId: BufferId): boolean {
    return this.assetId.compare(formatter.ensureBuffer(assetId)) === 0;
  }
}

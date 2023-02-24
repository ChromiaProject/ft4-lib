import { ensureBuffer, BufferId } from "../../../../cryptoUtils";

export default class TransferParam {
  readonly accountId: Buffer;
  readonly assetId: Buffer;
  readonly amount: number;

  constructor(accountId: BufferId, assetId: BufferId, amount: number) {
    this.accountId = ensureBuffer(accountId);
    this.assetId = ensureBuffer(assetId);
    this.amount = amount;
  }

  isAccountId(accountId: BufferId): boolean {
    return this.accountId.compare(ensureBuffer(accountId)) === 0;
  }

  isAssetId(assetId: BufferId): boolean {
    return this.assetId.compare(ensureBuffer(assetId)) === 0;
  }
}

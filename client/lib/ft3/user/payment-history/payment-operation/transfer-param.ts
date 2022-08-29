import { ensureBuffer, Id } from "../../../../cryptoUtils";

export default class TransferParam {
  readonly accountId: Buffer;
  readonly assetId: Buffer;
  readonly amount: number;

  constructor(accountId: Id, assetId: Id, amount: number) {
    this.accountId = ensureBuffer(accountId);
    this.assetId = ensureBuffer(assetId);
    this.amount = amount;
  }

  isAccountId(accountId: Id): boolean {
    return this.accountId.compare(ensureBuffer(accountId)) === 0;
  }

  isAssetId(assetId: Id): boolean {
    return this.assetId.compare(ensureBuffer(assetId)) === 0;
  }
}

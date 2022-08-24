import { ensureBuffer } from "../../../../cyptoUtils";

export default class TransferParam {
  readonly accountId: Buffer;
  readonly assetId: Buffer;
  readonly amount: number;

  constructor(
    accountId: string | Buffer,
    assetId: string | Buffer,
    amount: number
  ) {
    this.accountId = ensureBuffer(accountId);
    this.assetId = ensureBuffer(assetId);
    this.amount = amount;
  }

  isAccountId(accountId: string | Buffer): boolean {
    return this.accountId.compare(ensureBuffer(accountId)) === 0;
  }

  isAssetId(assetId: string | Buffer): boolean {
    return this.assetId.compare(ensureBuffer(assetId)) === 0;
  }
}

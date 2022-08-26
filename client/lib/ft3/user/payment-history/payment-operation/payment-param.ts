import { ensureBuffer } from "../../../../cyptoUtils";
import TransferParam from "./transfer-param";

export default class PaymentParam {
  readonly brid: Buffer;
  readonly accountId: Buffer;
  readonly assetId: Buffer;
  readonly amount: number;

  constructor(
    brid: string | Buffer,
    accountId: string | Buffer,
    assetId: string | Buffer,
    amount: number
  ) {
    this.brid = ensureBuffer(brid);
    this.accountId = ensureBuffer(accountId);
    this.assetId = ensureBuffer(assetId);
    this.amount = amount;
  }

  isBRID(brid: string | Buffer): boolean {
    return this.brid.compare(ensureBuffer(brid)) === 0;
  }

  isAccountId(accountId: string | Buffer): boolean {
    return this.accountId.compare(ensureBuffer(accountId)) === 0;
  }

  isAssetId(assetId: string | Buffer): boolean {
    return this.assetId.compare(ensureBuffer(assetId)) === 0;
  }

  static fromTransferParam(
    param: TransferParam,
    brid: string | Buffer
  ): PaymentParam {
    return new PaymentParam(brid, param.accountId, param.assetId, param.amount);
  }
}

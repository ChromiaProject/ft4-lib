import { ensureBuffer, Id } from "../../../../cyptoUtils";
import TransferParam from "./transfer-param";

export default class PaymentParam {
  readonly brid: Buffer;
  readonly accountId: Buffer;
  readonly assetId: Buffer;
  readonly amount: number;

  constructor(brid: Id, accountId: Id, assetId: Id, amount: number) {
    this.brid = ensureBuffer(brid);
    this.accountId = ensureBuffer(accountId);
    this.assetId = ensureBuffer(assetId);
    this.amount = amount;
  }

  isBRID(brid: Id): boolean {
    return this.brid.compare(ensureBuffer(brid)) === 0;
  }

  isAccountId(accountId: Id): boolean {
    return this.accountId.compare(ensureBuffer(accountId)) === 0;
  }

  isAssetId(assetId: Id): boolean {
    return this.assetId.compare(ensureBuffer(assetId)) === 0;
  }

  static fromTransferParam(param: TransferParam, brid: Id): PaymentParam {
    return new PaymentParam(brid, param.accountId, param.assetId, param.amount);
  }
}

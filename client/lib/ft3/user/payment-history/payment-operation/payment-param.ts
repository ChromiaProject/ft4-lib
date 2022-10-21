import { ensureBuffer, BufferId } from "../../../../cryptoUtils";
import TransferParam from "./transfer-param";

export default class PaymentParam {
  readonly brid: Buffer;
  readonly accountId: Buffer;
  readonly assetId: Buffer;
  readonly amount: number;

  constructor(
    brid: BufferId,
    accountId: BufferId,
    assetId: BufferId,
    amount: number
  ) {
    this.brid = ensureBuffer(brid);
    this.accountId = ensureBuffer(accountId);
    this.assetId = ensureBuffer(assetId);
    this.amount = amount;
  }

  isBRID(brid: BufferId): boolean {
    return this.brid.compare(ensureBuffer(brid)) === 0;
  }

  isAccountId(accountId: BufferId): boolean {
    return this.accountId.compare(ensureBuffer(accountId)) === 0;
  }

  isAssetId(assetId: BufferId): boolean {
    return this.assetId.compare(ensureBuffer(assetId)) === 0;
  }

  static fromTransferParam(param: TransferParam, brid: BufferId): PaymentParam {
    return new PaymentParam(brid, param.accountId, param.assetId, param.amount);
  }
}

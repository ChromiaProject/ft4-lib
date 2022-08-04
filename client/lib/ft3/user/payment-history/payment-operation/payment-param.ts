import TransferParam from "./transfer-param";

export default class PaymentParam {
  readonly brid: string;
  readonly accountId: string;
  readonly assetId: string;
  readonly amount: number;

  constructor(
    brid: string,
    accountId: string,
    assetId: string,
    amount: number
  ) {
    this.brid = brid;
    this.accountId = accountId;
    this.assetId = assetId;
    this.amount = amount;
  }

  isBRID(brid: string): boolean {
    return this.brid.toUpperCase() === brid.toUpperCase();
  }

  isAccountId(accountId: string): boolean {
    return this.accountId.toUpperCase() === accountId.toUpperCase();
  }

  isAssetId(assetId: string): boolean {
    return this.assetId.toUpperCase() === assetId.toUpperCase();
  }

  static fromTransferParam(param: TransferParam, brid: string): PaymentParam {
    return new PaymentParam(brid, param.accountId, param.assetId, param.amount);
  }
}

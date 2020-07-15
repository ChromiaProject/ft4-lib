

export default class TransferParam {
    readonly accountId: string;
    readonly assetId: string;
    readonly amount: number;

    constructor(accountId: string | Buffer, assetId: string | Buffer, amount: number) {
        this.accountId = accountId instanceof Buffer ? accountId.toString('hex') : accountId;
        this.assetId = assetId instanceof Buffer ? assetId.toString('hex') : assetId;
        this.amount = amount;
    }

    isAccountId(accountId: string): boolean {
        return this.accountId.toUpperCase() === accountId.toUpperCase();
    }

    isAssetId(assetId: string): boolean {
        return this.assetId.toUpperCase() === assetId.toUpperCase();
    }
}
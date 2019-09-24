

export default class TransferParam {
    readonly accountId: string;
    readonly assetId: string;
    readonly amount: number;

    constructor(accountId: string, assetId: string, amount: number) {
        this.accountId = accountId;
        this.assetId = assetId;
        this.amount = amount;
    }

    isAccountId(accountId: string): boolean {
        return this.accountId.toUpperCase() === accountId.toUpperCase();
    }

    isAssetId(assetId: string): boolean {
        return this.assetId.toUpperCase() === assetId.toUpperCase();
    }
}
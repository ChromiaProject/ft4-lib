import TransferParam from "./transfer-param";

export default class PaymentParam {
    readonly chainId: string;
    readonly accountId: string;
    readonly assetId: string;
    readonly amount: number;

    constructor(chainId: string, accountId: string, assetId: string, amount: number) {
        this.chainId = chainId;
        this.accountId = accountId;
        this.assetId = assetId;
        this.amount = amount;
    }

    isChainId(chainId: string): boolean {
        return this.chainId.toUpperCase() === chainId.toUpperCase();
    }

    isAccountId(accountId: string): boolean {
        return this.accountId.toUpperCase() === accountId.toUpperCase();
    }

    isAssetId(assetId: string): boolean {
        return this.assetId.toUpperCase() === assetId.toUpperCase();
    }

    static fromTransferParam(param: TransferParam, chainId: string): PaymentParam {
        return new PaymentParam(
            chainId,
            param.accountId,
            param.assetId,
            param.amount
        )
    }
}
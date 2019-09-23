import TransferOperation from "./transfer-operation";
import XTransferOperation from "./xtransfer-operation";
import PaymentParam from "./payment-param";

export default class PaymentOperation {
    readonly inputs: PaymentParam[];
    readonly outputs: PaymentParam[];

    constructor(inputs: PaymentParam[], outputs: PaymentParam[]) {
        this.inputs = inputs;
        this.outputs = outputs;
    }

    hasInputOrOutputAccount(accountId: string): boolean {
        return this.inputs.some(input => input.isAccountId(accountId)) ||
            this.outputs.some(output => output.isAccountId(accountId));
    }

    inputsWithAccount(accountId: string): PaymentParam[] {
        return this.inputs.filter(input => input.isAccountId(accountId));
    }

    outputsWithAccount(accountId: string): PaymentParam[] {
        return this.outputs.filter(output => output.isAccountId(accountId));
    }

    inputsWithAsset(assetId: string): PaymentParam[] {
        return this.inputs.filter(output => output.isAssetId(assetId));
    }

    outputsWithAsset(assetId: string): PaymentParam[] {
        return this.outputs.filter(output => output.isAssetId(assetId));
    }

    static fromTransfer(transfer: TransferOperation, chainId: string): PaymentOperation {
        const inputs = transfer.inputs.map(input => PaymentParam.fromTransferParam(input, chainId));
        const outputs = transfer.outputs.map(output => PaymentParam.fromTransferParam(output, chainId));
        return new PaymentOperation(inputs, outputs)
    }

    static fromXTransfer(transfer: XTransferOperation, sourceChainId: string): PaymentOperation {
        const input = PaymentParam.fromTransferParam(transfer.source, sourceChainId);
        const output = new PaymentParam(
            transfer.hops[transfer.hops.length-1],
            transfer.target.accountId,
            transfer.source.assetId,
            transfer.source.amount
        );

        return new PaymentOperation([input], [output]);
    }
}
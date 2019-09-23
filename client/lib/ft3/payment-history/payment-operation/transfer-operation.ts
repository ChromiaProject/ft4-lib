import TransferParam from "./transfer-param";

export default class TransferOperation {
    readonly inputs: TransferParam[];
    readonly outputs: TransferParam[];

    constructor(inputs: TransferParam[], outputs: TransferParam[]) {
        this.inputs = inputs;
        this.outputs = outputs;
    }

    hasInputOrOutputAccount(accountId: string): boolean {
        return this.inputs.some(input => input.isAccountId(accountId)) ||
               this.outputs.some(output => output.isAccountId(accountId));
    }

    inputsWithAccount(accountId: string): TransferParam[] {
        return this.inputs.filter(input => input.isAccountId(accountId));
    }

    outputsWithAccount(accountId: string): TransferParam[] {
        return this.outputs.filter(output => output.isAccountId(accountId));
    }

    paramsWithAccount(accountId: string): { inputs: TransferParam[], outputs: TransferParam[] } {
        return {
            inputs: this.inputsWithAccount(accountId),
            outputs: this.outputsWithAccount(accountId)
        }
    }

    inputsWithAsset(assetId: string): TransferParam[] {
        return this.inputs.filter(output => output.isAssetId(assetId));
    }

    outputsWithAsset(assetId: string): TransferParam[] {
        return this.outputs.filter(output => output.isAssetId(assetId));
    }

    static from(rawTransfer: any) {
        const inputs = rawTransfer.args[0].map(input =>
            new TransferParam(input[0], input[1], input[3])
        );
        const outputs = rawTransfer.args[1].map(input =>
            new TransferParam(input[0], input[1], input[2])
        );

        return new TransferOperation(inputs, outputs)
    }
}

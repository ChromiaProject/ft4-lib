import TransferOperation from "./transfer-operation";
import XTransferOperation from "./xtransfer-operation";
import PaymentParam from "./payment-param";

// PaymentOperation class is used to represent transfers and cross-chain transfers using one type. Original
// idea vas to implement PaymentOperation as adapter for for TransferOperation and XTransferOperation, to abstract
// different types of transfers, but that implementation would be more complex, and at the moment it looks like there
// is no value add from adding more complexity.
// When parsing raw transactions, inputs and outputs from transfers and cross-chain transfer will be copied to the
// PaymentOperation objects.
export default class PaymentOperation {
  readonly inputs: PaymentParam[];
  readonly outputs: PaymentParam[];

  constructor(inputs: PaymentParam[], outputs: PaymentParam[]) {
    this.inputs = inputs;
    this.outputs = outputs;
  }

  hasInputOrOutputWithChainAndAccount(
    chainId: string,
    accountId: string
  ): boolean {
    return (
      this.inputs.some(
        (input) => input.isChainId(chainId) && input.isAccountId(accountId)
      ) ||
      this.outputs.some(
        (output) => output.isChainId(chainId) && output.isAccountId(accountId)
      )
    );
  }

  inputsWithChainAndAccount(
    chainId: string,
    accountId: string
  ): PaymentParam[] {
    return this.inputs.filter(
      (input) => input.isChainId(chainId) && input.isAccountId(accountId)
    );
  }

  outputsWithChainAndAccount(
    chainId: string,
    accountId: string
  ): PaymentParam[] {
    return this.outputs.filter(
      (output) => output.isChainId(chainId) && output.isAccountId(accountId)
    );
  }

  inputsWithAsset(assetId: string): PaymentParam[] {
    return this.inputs.filter((output) => output.isAssetId(assetId));
  }

  outputsWithAsset(assetId: string): PaymentParam[] {
    return this.outputs.filter((output) => output.isAssetId(assetId));
  }

  static fromTransfer(
    transfer: TransferOperation,
    chainId: string
  ): PaymentOperation {
    const inputs = transfer.inputs.map((input) =>
      PaymentParam.fromTransferParam(input, chainId)
    );
    const outputs = transfer.outputs.map((output) =>
      PaymentParam.fromTransferParam(output, chainId)
    );
    return new PaymentOperation(inputs, outputs);
  }

  static fromXTransfer(
    transfer: XTransferOperation,
    sourceChainId: string
  ): PaymentOperation {
    const input = PaymentParam.fromTransferParam(
      transfer.source,
      sourceChainId
    );
    const output = new PaymentParam(
      transfer.hops[transfer.hops.length - 1],
      transfer.target.accountId,
      transfer.source.assetId,
      transfer.source.amount
    );

    return new PaymentOperation([input], [output]);
  }
}

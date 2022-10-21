import TransferOperation from "./transfer-operation";
import XTransferOperation from "./xtransfer-operation";
import PaymentParam from "./payment-param";
import { BufferId } from "../../../../cryptoUtils";

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
    brid: BufferId,
    accountId: BufferId
  ): boolean {
    return (
      this.inputs.some(
        (input) => input.isBRID(brid) && input.isAccountId(accountId)
      ) ||
      this.outputs.some(
        (output) => output.isBRID(brid) && output.isAccountId(accountId)
      )
    );
  }

  inputsWithChainAndAccount(
    brid: BufferId,
    accountId: BufferId
  ): PaymentParam[] {
    return this.inputs.filter(
      (input) => input.isBRID(brid) && input.isAccountId(accountId)
    );
  }

  outputsWithChainAndAccount(
    brid: BufferId,
    accountId: BufferId
  ): PaymentParam[] {
    return this.outputs.filter(
      (output) => output.isBRID(brid) && output.isAccountId(accountId)
    );
  }

  inputsWithAsset(assetId: BufferId): PaymentParam[] {
    return this.inputs.filter((output) => output.isAssetId(assetId));
  }

  outputsWithAsset(assetId: BufferId): PaymentParam[] {
    return this.outputs.filter((output) => output.isAssetId(assetId));
  }

  static fromTransfer(
    transfer: TransferOperation,
    brid: BufferId
  ): PaymentOperation {
    const inputs = transfer.inputs.map((input) =>
      PaymentParam.fromTransferParam(input, brid)
    );
    const outputs = transfer.outputs.map((output) =>
      PaymentParam.fromTransferParam(output, brid)
    );
    return new PaymentOperation(inputs, outputs);
  }

  static fromXTransfer(
    transfer: XTransferOperation,
    sourceBRID: BufferId
  ): PaymentOperation {
    const input = PaymentParam.fromTransferParam(transfer.source, sourceBRID);
    const output = new PaymentParam(
      transfer.hops[transfer.hops.length - 1],
      transfer.target.accountId,
      transfer.source.assetId,
      transfer.source.amount
    );

    return new PaymentOperation([input], [output]);
  }
}

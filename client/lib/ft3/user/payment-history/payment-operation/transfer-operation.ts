import TransferParam from "./transfer-param";

export default class TransferOperation {
  readonly inputs: TransferParam[];
  readonly outputs: TransferParam[];

  constructor(inputs: TransferParam[], outputs: TransferParam[]) {
    this.inputs = inputs;
    this.outputs = outputs;
  }

  static from(rawTransfer: any) {
    const inputs = rawTransfer.args[0].map(
      (input) => new TransferParam(input[0], input[1], input[3])
    );
    const outputs = rawTransfer.args[1].map(
      (input) => new TransferParam(input[0], input[1], input[2])
    );

    return new TransferOperation(inputs, outputs);
  }
}

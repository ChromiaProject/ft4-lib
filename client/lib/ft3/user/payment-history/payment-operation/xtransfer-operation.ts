import TransferParam from "./transfer-param";
import XTransferTarget from "./xtransfer-target";

export default class XTransferOperation {
  readonly source: TransferParam;
  readonly target: XTransferTarget;
  readonly hops: string[];

  constructor(source: TransferParam, target: XTransferTarget, hops: string[]) {
    this.source = source;
    this.target = target;
    this.hops = hops;
  }

  static from(rawTransfer: any): XTransferOperation {
    const rawSource = rawTransfer.args[0];
    const source = new TransferParam(rawSource[0], rawSource[1], rawSource[3]);
    const target = new XTransferTarget(rawTransfer.args[1][0]);
    const hops = rawTransfer.args[2];

    return new XTransferOperation(source, target, hops);
  }
}

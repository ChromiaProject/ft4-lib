import { GtvSerializable } from "./account";

export class XferInput implements GtvSerializable {
  constructor(
    readonly accountId: Buffer,
    readonly authDescriptorId: Buffer,
    readonly assetId: Buffer,
    readonly amount: number
  ) {}

  toGTV(): any[] {
    return [
      this.accountId,
      this.assetId,
      this.authDescriptorId,
      this.amount,
      [],
    ].toGTV();
  }
}

export function xferInput(
  accountId: Buffer,
  authDescriptorId: Buffer,
  assetId: Buffer,
  amount: number
): XferInput {
  return new XferInput(accountId, authDescriptorId, assetId, amount);
}

export class XferOutput implements GtvSerializable {
  constructor(
    readonly accountId: Buffer,
    readonly assetId: Buffer,
    readonly amount: number
  ) {}

  toGTV(): any[] {
    return [this.accountId, this.assetId, this.amount, []].toGTV();
  }
}

export function xferOutput(
  accountId: Buffer,
  assetId: Buffer,
  amount: number
): XferOutput {
  return new XferOutput(accountId, assetId, amount);
}

export class SimpleTransfer implements GtvSerializable {
  constructor(
    readonly sourceAccountId: Buffer,
    readonly destinationAccountId: Buffer,
    readonly authDescriptorId: Buffer,
    readonly assetId: Buffer,
    readonly amount: number
  ) {}

  toGTV(): any[] {
    return [
      "simple_transfer",
      xferInput(
        this.sourceAccountId,
        this.authDescriptorId,
        this.assetId,
        this.amount
      ),
      xferOutput(this.destinationAccountId, this.assetId, this.amount),
    ].toGTV();
  }
}

export function simpleTransfer(
  sourceAccountId: Buffer,
  destinationAccountId: Buffer,
  authDescriptorId: Buffer,
  assetId: Buffer,
  amount: number
): SimpleTransfer {
  return new SimpleTransfer(
    sourceAccountId,
    destinationAccountId,
    authDescriptorId,
    assetId,
    amount
  );
}

export class Transfer implements GtvSerializable {
  constructor(readonly inputs: XferInput[], readonly outputs: XferOutput[]) {}

  toGTV(): any[] {
    return ["transfer", this.inputs, this.outputs].toGTV();
  }
}

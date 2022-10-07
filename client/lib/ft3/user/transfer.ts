import { GtvEncodable, GtvEncoded } from "../core/gtv";

export class XferInput implements GtvEncodable {
  constructor(
    readonly accountId: Buffer,
    readonly authDescriptorId: Buffer,
    readonly assetId: Buffer,
    readonly amount: number
  ) {}

  encodeGtv(): GtvEncoded {
    return [
      this.accountId,
      this.assetId,
      this.authDescriptorId,
      this.amount,
      [],
    ].encodeGtv();
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

export class XferOutput implements GtvEncodable {
  constructor(
    readonly accountId: Buffer,
    readonly assetId: Buffer,
    readonly amount: number
  ) {}

  encodeGtv(): GtvEncoded {
    return [this.accountId, this.assetId, this.amount, []].encodeGtv();
  }
}

export function xferOutput(
  accountId: Buffer,
  assetId: Buffer,
  amount: number
): XferOutput {
  return new XferOutput(accountId, assetId, amount);
}

export class SimpleTransfer implements GtvEncodable {
  constructor(
    readonly sourceAccountId: Buffer,
    readonly destinationAccountId: Buffer,
    readonly authDescriptorId: Buffer,
    readonly assetId: Buffer,
    readonly amount: number
  ) {}

  encodeGtv(): GtvEncoded {
    return [
      "simple_transfer",
      xferInput(
        this.sourceAccountId,
        this.authDescriptorId,
        this.assetId,
        this.amount
      ),
      xferOutput(this.destinationAccountId, this.assetId, this.amount),
    ].encodeGtv();
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

export class Transfer implements GtvEncodable {
  constructor(readonly inputs: XferInput[], readonly outputs: XferOutput[]) {}

  encodeGtv(): GtvEncoded {
    return ["transfer", this.inputs, this.outputs].encodeGtv();
  }
}

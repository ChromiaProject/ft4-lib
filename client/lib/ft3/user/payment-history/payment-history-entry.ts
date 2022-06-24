export default class PaymentHistoryEntry {
  readonly isInput: boolean;
  readonly delta: number;
  readonly asset: string;
  readonly assetId: Buffer;
  readonly chainId: Buffer;
  readonly other: any[];
  readonly timestamp: Date;
  readonly transactionId: Buffer;
  readonly blockHeight: number;

  constructor(
    isInput: boolean,
    delta: number,
    asset: string,
    assetId: Buffer,
    other: any[],
    timestamp: Date,
    transactionId: Buffer,
    blockHeight: number
  ) {
    this.isInput = isInput;
    this.delta = delta;
    this.asset = asset;
    this.assetId = assetId;
    this.other = other;
    this.timestamp = timestamp;
    this.transactionId = transactionId;
    this.blockHeight = blockHeight;
  }
  //eslint-disable-next-line @typescript-eslint/ban-types
  adaptForSerialization(): {} {
    //eslint: {} is "non-nullish"; use Record<string, unknown> (means any object), unknown (means any value), or Record<string, never> (means empty object)
    const {
      isInput,
      delta,
      asset,
      assetId,
      other,
      timestamp,
      transactionId,
      blockHeight,
    } = this;

    return {
      isInput,
      delta,
      asset,
      assetId: assetId.toString("hex"),
      other,
      timestamp: timestamp.getTime(),
      transactionId: transactionId.toString("hex"),
      blockHeight,
    };
  }
}

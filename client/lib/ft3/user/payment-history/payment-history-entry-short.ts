export default class PaymentHistoryEntryShort {
  readonly isInput: boolean;
  readonly delta: number;
  readonly asset: string;
  readonly assetId: string;
  readonly entryIndex: number;
  readonly timestamp: Date;
  readonly transactionId: string;
  readonly transactionData: Buffer;
  readonly blockHeight: number;

  constructor(
    isInput: boolean,
    delta: number,
    asset: string,
    assetId: string,
    entryIndex: number,
    timestamp: Date,
    transactionId: string,
    transactionData: Buffer,
    blockHeight: number
  ) {
    this.isInput = isInput;
    this.delta = delta;
    this.asset = asset;
    this.assetId = assetId;
    this.entryIndex = entryIndex;
    this.timestamp = timestamp;
    this.transactionId = transactionId;
    this.transactionData = transactionData;
    this.blockHeight = blockHeight;
  }

  static from(responseEntry: any): PaymentHistoryEntryShort {
    return new PaymentHistoryEntryShort(
      responseEntry.is_input === 1,
      responseEntry.delta,
      responseEntry.asset,
      responseEntry.asset_id,
      responseEntry.entry_index,
      new Date(responseEntry.timestamp),
      responseEntry.tx_rid.toUpperCase(),
      Buffer.from(responseEntry.tx_data, "hex"),
      responseEntry.block_height
    );
  }
}

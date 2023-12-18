import { Amount } from "../../asset/interfaces";
import { PageCursor } from "../../types";
import { Buffer } from "buffer";
import { Asset, AssetResponse } from "../../asset/types";

export type TransferHistoryEntryResponse = {
  id: number;
  delta: bigint;
  /**
   * @deprecated Use `asset_data.decimals` instead
   */
  decimals: number;
  /**
   * @deprecated Use `asset_data` instead
   */
  asset: string;
  /**
   * @deprecated Use `asset_data.id` instead
   */
  asset_id: Buffer;
  asset_data: AssetResponse;
  is_input: number;
  timestamp: number;
  block_height: number;
  entry_index: number;
  tx_rid: Buffer;
  tx_data: string;
  operation_name: string;
};

export type TransferHistoryEntry = {
  rowid: number;
  isInput: boolean;
  delta: Amount;
  /**
   * @deprecated Use `asset_data` instead
   */
  asset: AssetInfo;
  assetData: Asset;
  entryIndex: number;
  data: Buffer;
  timestamp: Date;
  transactionId: Buffer;
  blockHeight: number;
  operationName: string;
};

export type TransferHistoryResponse = {
  data: TransferHistoryEntry[];
  nextCursor: PageCursor | null;
};

export enum TransferHistoryType {
  Sent = 0,
  Received = 1,
}

export type TransferHistoryFilter = {
  transferHistoryType?: TransferHistoryType;
};

type AssetInfo = {
  name: string;
  id: Buffer;
};

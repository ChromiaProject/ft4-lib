import { Operation, RawGtx } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { op } from "../utils";
import { getInitTransferArgs } from "./op-functions";
import { BufferId } from "../cryptoUtils";

// Constant index for init_transfer operation, applicable when not using TransactionBuilder.
export const OP_INDEX_INIT_TRANSFER = 1;

export function initTransfer(
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
): Operation {
  return op(
    "ft4.crosschain.init_transfer",
    ...getInitTransferArgs(recipientId, assetId, amount, hops),
  );
}

export function applyTransfer(
  initTransferTx: RawGtx,
  tx: RawGtx,
  targetChainIndex: number,
  initTransferOpIndex: number = OP_INDEX_INIT_TRANSFER,
  operationIndex: number = OP_INDEX_INIT_TRANSFER,
): Operation {
  return op(
    "ft4.crosschain.apply_transfer",
    initTransferTx,
    initTransferOpIndex,
    tx,
    operationIndex,
    targetChainIndex,
  );
}

export function completeTransfer(tx: RawGtx, opIndex: number): Operation {
  return op("ft4.crosschain.complete_transfer", tx, opIndex);
}

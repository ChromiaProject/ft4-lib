import { Operation, RawGtx, formatter } from "postchain-client";
import { Amount } from "@ft4/asset";
import { op, BufferId } from "@ft4/utils";
import { GtvInitTransferArgs } from "@ft4/crosschain/types";

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

export function getInitTransferArgs(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
): GtvInitTransferArgs {
  return [
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount.value,
    hops.map(formatter.ensureBuffer),
  ];
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

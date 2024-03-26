import { Operation, RawGtx, formatter } from "postchain-client";
import { Amount } from "@ft4/asset";
import { op, BufferId } from "@ft4/utils";
import { GtvInitTransferArgs } from "@ft4/crosschain/types";

export function initTransfer(
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
  deadline: number,
): Operation {
  return op(
    "ft4.crosschain.init_transfer",
    ...getInitTransferArgs(recipientId, assetId, amount, hops, deadline),
  );
}

export function getInitTransferArgs(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
  deadline: number,
): GtvInitTransferArgs {
  return [
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount.value,
    hops.map(formatter.ensureBuffer),
    deadline,
  ];
}

export function applyTransfer(
  initTransferTx: RawGtx,
  initTransferOpIndex: number,
  tx: RawGtx,
  operationIndex: number,
  targetChainIndex: number,
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

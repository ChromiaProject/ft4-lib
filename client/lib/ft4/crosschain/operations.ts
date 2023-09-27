import { Operation, SignedTransaction, formatter, gtv } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { BufferId } from "/cryptoUtils";
import { op } from "../utils";
import { GtvInitTransferArgs } from "./types";

// Constant index for init_transfer operation, applicable when not using TransactionBuilder.
export const OP_INDEX_INIT_TRANSFER = 1;

function getInitTransferArgs(
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
): GtvInitTransferArgs {
  return [
    formatter.ensureBuffer(recipientId),
    formatter.ensureBuffer(assetId),
    amount.value,
    hops.map(formatter.ensureBuffer),
  ];
}

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
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
  tx: SignedTransaction,
  targetChainIndex: number,
  operationIndex: number = OP_INDEX_INIT_TRANSFER,
): Operation {
  return op(
    "ft4.crosschain.apply_transfer",
    getInitTransferArgs(recipientId, assetId, amount, hops),
    gtv.decode(tx),
    operationIndex,
    targetChainIndex,
  );
}

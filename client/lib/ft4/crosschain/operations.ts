import { Operation, SignedTransaction, gtv } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { op } from "../utils";
import { getInitTransferArgs } from "./op-functions";
import { BufferId } from "/cryptoUtils";

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

export function deletePendingTransfer(
  tx: SignedTransaction,
  initialTxRid: Buffer,
  opIndex: number,
): Operation {
  return op(
    "ft4.crosschain.delete_pending_transfer",
    gtv.decode(tx),
    initialTxRid,
    opIndex,
  );
}

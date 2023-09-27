import { Operation, SignedTransaction, formatter, gtv } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { BufferId } from "/cryptoUtils";
import { op } from "../utils";

// Constant index for init_transfer operation, applicable when not using TransactionBuilder.
const OP_INDEX_INIT_TRANSFER = 1;

export function initTransfer(
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  path: BufferId[],
): Operation {
  return op(
    "ft4.crosschain.init_transfer",
    formatter.ensureBuffer(recipientId),
    formatter.ensureBuffer(assetId),
    amount.encodeGtv(),
    path.map((item) => formatter.ensureBuffer(item)),
  );
}

export function applyTransfer(
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  path: BufferId[],
  tx: SignedTransaction,
  targetChainIndex: number,
  operationIndex: typeof OP_INDEX_INIT_TRANSFER = OP_INDEX_INIT_TRANSFER,
): Operation {
  return op(
    "ft4.crosschain.apply_transfer",
    [
      formatter.ensureBuffer(recipientId),
      formatter.ensureBuffer(assetId),
      amount.encodeGtv(),
      path.map((item) => formatter.ensureBuffer(item)),
    ],
    gtv.decode(tx),
    operationIndex,
    targetChainIndex,
  );
}

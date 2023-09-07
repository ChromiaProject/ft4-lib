import { Operation, SignedTransaction, formatter, gtv } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { BufferId } from "/cryptoUtils";
import { op } from "../utils";

export function initTransfer(
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  path: BufferId[],
): Operation {
  return op(
    "ft4.init_transfer",
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
): Operation {
  return op(
    "ft4.apply_transfer",
    [
      formatter.ensureBuffer(recipientId),
      formatter.ensureBuffer(assetId),
      amount.encodeGtv(),
      path.map((item) => formatter.ensureBuffer(item)),
    ],
    gtv.decode(tx),
    tx,
    0,
    targetChainIndex,
  );
}

import { op } from "../utils";
import { BufferId } from "../../cryptoUtils";
import { formatter, gtv, Operation, SignedTransaction } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { InitTransferArgs } from "./types";

export function initTransfer(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
): Operation {
  return op(
    "ft4.crosschain.init_transfer",
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount.encodeGtv(),
    hops.map(formatter.ensureBuffer),
  );
}

export function applyTransfer(
  initArgs: InitTransferArgs,
  tx: SignedTransaction,
  opIndex: number,
  hopIndex: number,
): Operation {
  return op(
    "ft4.crosschain.apply_transfer",
    initArgs,
    gtv.decode(tx),
    opIndex,
    hopIndex,
  );
}

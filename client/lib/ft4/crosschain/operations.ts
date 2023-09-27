import { op } from "../utils";
import { BufferId } from "../../cryptoUtils";
import { gtv, Operation, SignedTransaction } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { GtvInitTransferArgs } from "./types";
import { getInitTransferArgs } from ".";

export function initTransfer(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
): Operation {
  return op(
    "ft4.crosschain.init_transfer",
    ...getInitTransferArgs(receiverId, assetId, amount, hops),
  );
}

export function applyTransfer(
  initArgs: GtvInitTransferArgs,
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

import { SignedTransaction, TransactionReceipt } from "postchain-client";
import { Connection } from "../types";
import { Authenticator } from "../authentication/types";
import {
  applyTransfer as applyTransferOp,
  initTransfer as initTransferOp,
} from "./operations";
import { call } from "../ft-session";
import { BufferId } from "../../cryptoUtils";
import { Amount } from "../asset/interfaces";
import { GtvInitTransferArgs } from "./types";

export async function initTransfer(
  connection: Connection,
  authenticator: Authenticator,
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    initTransferOp(receiverId, assetId, amount, hops),
  );
}

export async function applyTransfer(
  connection: Connection,
  authenticator: Authenticator,
  initArgs: GtvInitTransferArgs,
  tx: SignedTransaction,
  opIndex: number,
  hopIndex: number,
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    applyTransferOp(initArgs, tx, opIndex, hopIndex),
  );
}

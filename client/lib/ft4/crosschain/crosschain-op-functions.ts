import {
  SignedTransaction,
  TransactionReceipt,
  formatter,
} from "postchain-client";
import { Connection } from "../types";
import { Authenticator } from "../authentication/types";
import {
  applyTransfer as applyTransferOp,
  initTransfer as initTransferOp,
} from "./crosschain-operations";
import { call } from "../ft-session";
import { BufferId } from "../../cryptoUtils";
import { Amount } from "../asset/interfaces";
import { InitTransferArgs } from "./types";

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
  initArgs: InitTransferArgs,
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

export function getInitTransferArgs(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
): InitTransferArgs {
  return [
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount.value,
    hops.map(formatter.ensureBuffer),
  ];
}

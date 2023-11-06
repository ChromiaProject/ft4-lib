import { RawGtx, TransactionReceipt, formatter } from "postchain-client";
import { Connection } from "../types";
import { Authenticator } from "../authentication/types";
import {
  OP_INDEX_INIT_TRANSFER,
  applyTransfer as applyTransferOp,
  initTransfer as initTransferOp,
} from "./operations";
import { call } from "../ft-session";
import { Amount } from "../asset/interfaces";
import { GtvInitTransferArgs } from "./types";
import { BufferId } from "/ft4/utils/types";

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
  initTransferTx: RawGtx,
  tx: RawGtx,
  targetChainIndex: number,
  initTransferOpIndex: number = OP_INDEX_INIT_TRANSFER,
  operationIndex: number = OP_INDEX_INIT_TRANSFER,
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    applyTransferOp(
      initTransferTx,
      tx,
      targetChainIndex,
      initTransferOpIndex,
      operationIndex,
    ),
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

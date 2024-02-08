import { RawGtx, TransactionReceipt, formatter } from "postchain-client";
import { Connection } from "@ft4/index";
import { Authenticator } from "@ft4/authentication";
import {
  OP_INDEX_INIT_TRANSFER,
  applyTransfer as applyTransferOp,
  initTransfer as initTransferOp,
} from "./operations";
import { call } from "@ft4/ft-session";
import { Amount } from "@ft4/asset";
import { GtvInitTransferArgs } from "./types";
import { BufferId } from "@ft4/utils";

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

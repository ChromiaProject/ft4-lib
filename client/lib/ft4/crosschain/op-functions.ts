import { GTX, TransactionReceipt } from "postchain-client";
import { Connection } from "../types";
import { Authenticator } from "../authentication/types";
import {
  OP_INDEX_INIT_TRANSFER,
  applyTransfer as applyTransferOp,
  initTransfer as initTransferOp,
} from "./operations";
import { call } from "../ft-session";
import { BufferId } from "../../cryptoUtils";
import { Amount } from "../asset/interfaces";

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
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
  tx: GTX,
  targetChainIndex: number,
  operationIndex: number = OP_INDEX_INIT_TRANSFER,
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    applyTransferOp(
      recipientId,
      assetId,
      amount,
      hops,
      tx,
      targetChainIndex,
      operationIndex,
    ),
  );
}

import {
  BufferId,
  GTX,
  Operation,
  RawGtx,
  formatter,
  gtx,
} from "postchain-client";
import { Amount } from "@ft4/asset";
import { op } from "@ft4/utils";
import { GtvInitTransferArgs } from "./types";

/**
 * Builds an operation object that can be used to call `ft4.crosschain.init_transfer` operation
 * @param recipientId - id of the account that will receive this transfer
 * @param assetId - the id of the asset that will be transferred
 * @param amount - how much of the specified asset that will be transferred
 * @param hops - a list containing rids of the blockchains that are on the path from the source to the target chain, including the target chain
 * @param deadline - after how many days this transfer can be reverted if not claimed
 */
export function initTransfer(
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
  deadline: number,
): Operation {
  return op(
    "ft4.crosschain.init_transfer",
    ...getInitTransferArgs(recipientId, assetId, amount, hops, deadline),
  );
}

function getInitTransferArgs(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
  hops: BufferId[],
  deadline: number,
): GtvInitTransferArgs {
  return [
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount.value,
    hops.map(formatter.ensureBuffer),
    deadline,
  ];
}

/**
 * Builds an operation object that can be used to call `ft4.crosschain.complete_transfer` operation
 * @param initTransferTx - the transaction that contains the init_transfer operation for the transfer to apply
 * @param initTransferOpIndex - the index of the transfer operation inside the `initTransferTx` transaction
 * @param tx - the transaction that was submitted to the previous chain hop on the path which contains the transfer to apply
 * @param operationIndex - the index inside the `tx` object at which the transfer to apply can be found
 * @param targetChainIndex - the index of the current chain on the path
 */
export function applyTransfer(
  initTransferTx: GTX,
  initTransferOpIndex: number,
  tx: GTX,
  operationIndex: number,
  targetChainIndex: number,
): Operation {
  return op(
    "ft4.crosschain.apply_transfer",
    gtx.gtxToRawGtx(initTransferTx),
    initTransferOpIndex,
    gtx.gtxToRawGtx(tx),
    operationIndex,
    targetChainIndex,
  );
}

/**
 * Builds an operation object that can be used to call `ft4.crosschain.complete_transfer` operation
 * @param tx - the transaction that was submitted to the previous chain hop on the path which contains the transfer to complete
 * @param opIndex - the index inside the `tx` object at which the transfer to complete can be found
 */
export function completeTransfer(tx: RawGtx, opIndex: number): Operation {
  return op("ft4.crosschain.complete_transfer", tx, opIndex);
}

/**
 * Builds an operation object that can be used to call `ft4.crosschain.cancel_transfer` operation
 * @param initTransferTx - the transaction that contains the init_transfer operation for the transfer to cancel
 * @param initTransferOpIndex - the index of the transfer operation inside the `initTransferTx` transaction
 * @param tx - the transaction that was submitted to this chain and which contains the transfer to cancel
 * @param operationIndex - the index inside the `tx` object at which the transfer to cancel can be found
 * @param targetChainIndex - the index of the current chain on the path
 */
export function cancelTransfer(
  initTransferTx: GTX,
  initTransferOpIndex: number,
  tx: GTX,
  operationIndex: number,
  targetChainIndex: number,
): Operation {
  return op(
    "ft4.crosschain.cancel_transfer",
    gtx.gtxToRawGtx(initTransferTx),
    initTransferOpIndex,
    gtx.gtxToRawGtx(tx),
    operationIndex,
    targetChainIndex,
  );
}

/**
 * Builds an operation object that can be used to call `ft4.crosschain.unapply_transfer` operation
 * @param initTransferTx - the transaction that contains the init_transfer operation for the transfer to un-apply
 * @param initTransferOpIndex - the index of the transfer operation inside the `initTransferTx` transaction
 * @param tx - the transaction that was submitted to this chain and which contains the transfer to un-apply
 * @param operationIndex - the index inside the `tx` object at which the transfer to un-apply can be found
 * @param targetChainIndex - the index of the current chain on the path
 */
export function unapplyTransfer(
  initTransferTx: GTX,
  initTransferOpIndex: number,
  tx: GTX,
  operationIndex: number,
  targetChainIndex: number,
): Operation {
  return op(
    "ft4.crosschain.unapply_transfer",
    gtx.gtxToRawGtx(initTransferTx),
    initTransferOpIndex,
    gtx.gtxToRawGtx(tx),
    operationIndex,
    targetChainIndex,
  );
}

/**
 * Builds an operation object that can be used to call `ft4.crosschain.revert_transfer` operation
 * @param initTransferTx - the transaction that contains the init_transfer operation for the transfer to revert
 * @param initTransferOpIndex - the index of the transfer operation inside the `initTransferTx` transaction
 * @param tx - the transaction that was submitted to this chain and which contains the transfer to revert
 * @param operationIndex - the index inside the `tx` object at which the transfer to revert can be found
 */
export function revertTransfer(
  initTransferTx: GTX,
  initTransferOpIndex: number,
  tx: GTX,
  operationIndex: number,
): Operation {
  return op(
    "ft4.crosschain.revert_transfer",
    gtx.gtxToRawGtx(initTransferTx),
    initTransferOpIndex,
    gtx.gtxToRawGtx(tx),
    operationIndex,
  );
}

/**
 * Builds an operation object that can be used to call `ft4.crosschain.recall_unclaimed_transfer` operation
 * @param initTransferTx - the transaction that contains the init_transfer operation for the transfer to recall
 * @param initTransferOpIndex - the index of the transfer operation inside the `initTransferTx` transaction
 */
export function recallUnclaimedTransfer(
  initTransferTx: GTX,
  initTransferOpIndex: number,
): Operation {
  return op(
    "ft4.crosschain.recall_unclaimed_transfer",
    gtx.gtxToRawGtx(initTransferTx),
    initTransferOpIndex,
  );
}

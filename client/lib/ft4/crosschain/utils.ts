import { BufferId, GTX, gtx, RawGtx } from "postchain-client";
import {
  PendingTransfer,
  GtvInitTransferArgs,
  EvaluationResult,
  UnclaimedTransferStatus,
} from "./types";
import { Connection, createConnectionToBlockchainRid } from "@ft4/ft-session";
import { isTransferApplied } from "./query-functions";
import { getTransactionRid } from "@ft4/utils";
import { AccountResponse } from "@ft4/accounts";
import {
  PendingTransferExpirationState,
  pendingTransferStrategies,
} from "@ft4/registration";

function extractExpirationTimeFromCrosschainTransfer(
  transfer: PendingTransfer,
): number {
  // deadline is the fifth argument of initTransfer
  return transfer.tx.operations[transfer.opIndex].args[4] as number;
}

/**
 * Checks whether a single crosschain transfer has expired.
 * @example
 * To retrieve expired crosschain transfers and revert them, you could use
 * the following code.
 * ```
 * const transfersPage = await account.getPendingCrosschainTransfers();
 * const expiredTransfers = transfersPage.data.filter(hasCrosschainTransferExpired);
 * ```
 *
 * @param transfer - The transfer to check
 * @returns whether the transfer has expired
 */
export function hasCrosschainTransferExpired(
  transfer: PendingTransfer,
): boolean {
  return extractExpirationTimeFromCrosschainTransfer(transfer) < Date.now();
}

/**
 * Converts a GTX transaction to a RawGtx format
 * @param tx - The GTX transaction to convert
 * @returns The transaction in RawGtx format
 */
export function gtxToRawGtx(tx: GTX): RawGtx {
  return [gtx.gtxToRawGtxBody(tx), tx.signatures ?? []];
}

export function extractInitArgs(
  transfer: PendingTransfer,
): GtvInitTransferArgs {
  return transfer.tx.operations[transfer.opIndex].args as GtvInitTransferArgs;
}

/**
 * Evaluates a pending transfer.
 * @param transfer - The pending transfer to evaluate. It doesn't need to have a sender account field.
 * @param startConnection - The connection to the starting blockchain.
 * @returns The evaluation result.
 */
export async function evaluatePendingTransfer(
  transfer: PendingTransfer,
  startConnection: Connection,
): Promise<EvaluationResult> {
  const expired = hasCrosschainTransferExpired(transfer);
  const initTxRid = getTransactionRid(transfer.tx, startConnection);

  const args = extractInitArgs(transfer);
  const recipient = args[0];
  const hops = args[3];

  const targetConnection = await createConnectionToBlockchainRid(
    startConnection,
    hops[hops.length - 1],
  );
  const reachedTargetChain = await isTransferApplied(
    targetConnection,
    initTxRid,
    transfer.opIndex,
  );

  const targetAccount = await targetConnection.getAccountById(recipient);
  const targetAccountExists = targetAccount !== null;
  const claimed = reachedTargetChain && targetAccountExists;

  const fundsMustReturnToSender = expired && !claimed;

  return {
    expired,
    reachedTargetChain,
    claimed,
    targetAccountExists,
    fundsMustReturnToSender,
  };
}

/**
 * Checks if a crosschain transfer is unclaimed and determines its status.
 * Works on any completed crosschain transfer, regardless of whether it was meant to create an account.
 *
 * @param txRid - The transaction RID of the transfer
 * @param opIndex - The operation index of the transfer
 * @param startConnection - The connection to the blockchain where the transfer was initiated
 * @returns The status of the unclaimed transfer (MustBeRecalled, MustBeClaimed, or IsDone)
 */
export async function isUnclaimedTransfer(
  txRid: BufferId,
  opIndex: number,
  startConnection: Connection,
): Promise<UnclaimedTransferStatus> {
  const tx = gtx.deserialize(
    await startConnection.client.getTransaction(txRid),
  );
  const transferAsPendingTransfer: PendingTransfer = {
    tx,
    opIndex,
    senderAccount: null as any as AccountResponse,
  };

  const args = extractInitArgs(transferAsPendingTransfer);
  const hops = args[3];
  const recipient = args[0];
  const targetBrid = hops[hops.length - 1];

  const targetConnection = await createConnectionToBlockchainRid(
    startConnection,
    targetBrid,
  );

  let isStrategyPending: boolean;
  try {
    const pendings = await targetConnection.query(
      pendingTransferStrategies(recipient, {
        state: [PendingTransferExpirationState.Valid],
      }),
    );
    if (pendings.length > 0) {
      isStrategyPending = true;
    } else {
      isStrategyPending = false;
    }
  } catch (error) {
    // query failed, so the chain doesn't allow account creation strategies
    isStrategyPending = false;
  }

  const targetAccount = await targetConnection.getAccountById(recipient);
  const targetAccountExists = targetAccount !== null;

  if (isStrategyPending) return UnclaimedTransferStatus.MustBeClaimed;
  if (targetAccountExists) return UnclaimedTransferStatus.IsDone;
  return UnclaimedTransferStatus.MustBeRecalled;
}

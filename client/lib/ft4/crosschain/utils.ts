import { GTX, gtx, RawGtx } from "postchain-client";
import { PendingTransfer } from "./types";

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

export function gtxToRawGtx(tx: GTX): RawGtx {
  return [gtx.gtxToRawGtxBody(tx), tx.signatures ?? []];
}

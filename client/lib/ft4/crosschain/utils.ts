import { formatter } from "postchain-client";
import { PendingTransfer } from "./types";

function extractExpirationTimeFromCrosschainTransfer(
  transfer: PendingTransfer,
): number {
  const tx = formatter.rawGtxToGtx(transfer.tx);
  // deadline is the fifth argument of initTransfer
  return tx.operations[transfer.opIndex].args[4] as number;
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
 * @param transfer The transfer to check
 * @returns whether the transfer has expired
 */
export function hasCrosschainTransferExpired(
  transfer: PendingTransfer,
): boolean {
  return extractExpirationTimeFromCrosschainTransfer(transfer) < Date.now();
}

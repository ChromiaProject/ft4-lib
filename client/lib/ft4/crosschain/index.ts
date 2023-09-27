import { formatter } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { GtvInitTransferArgs } from "./types";
import { BufferId } from "/cryptoUtils";

export { getAssetOriginById } from "./query-functions";
export { initTransfer, applyTransfer } from "./op-functions";
export { findPathToChainForAsset, PathfinderError } from "./pathfinder";
export { GtvInitTransferArgs } from "./types";

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

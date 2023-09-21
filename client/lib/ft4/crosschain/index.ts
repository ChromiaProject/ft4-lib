import { formatter } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { GtvInitTransferArgs } from "./types";
import { BufferId } from "/cryptoUtils";

export { createOrchestrator } from "./orchestrator";
export { getAssetOriginById } from "./crosschain-query-functions";
export { initTransfer, applyTransfer } from "./crosschain-op-functions";
export { findPathToChainForAsset, PathfinderError } from "./pathfinder";

export { Orchestrator, GtvInitTransferArgs } from "./types";

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

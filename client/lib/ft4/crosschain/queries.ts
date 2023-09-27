import { QueryObject, formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { Buffer } from "buffer";

export function assetOriginById(
  assetId: BufferId,
): QueryObject<{ asset_id: Buffer }> {
  return {
    name: "ft4.crosschain.get_asset_origin_by_id",
    args: {
      asset_id: formatter.ensureBuffer(assetId),
    },
  };
}

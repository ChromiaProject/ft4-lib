import { Buffer } from "buffer";
import { IClient } from "postchain-client";
import { SystemChainException } from "postchain-client";
import { QueryObject } from "postchain-client";

export async function getSystemAnchoringChain(
  directoryClient: IClient,
): Promise<Buffer> {
  try {
    return await directoryClient.query(systemAnchoringChain());
  } catch (error) {
    throw new SystemChainException(error.message);
  }
}

function systemAnchoringChain(): QueryObject<Buffer> {
  return {
    name: "cm_get_system_anchoring_chain",
  };
}

import { Buffer } from "buffer";
import {
  IClient,
  Queryable,
  QueryObject,
  SystemChainException,
  createClient,
} from "postchain-client";

export async function getDirectoryClient(
  nodeUrlPool: string[],
): Promise<IClient> {
  return await createClient({
    nodeUrlPool,
    blockchainIid: 0,
  });
}

export async function getSystemAnchoringChain(
  directoryClient: Queryable,
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

export async function getBlockchainApiUrls(
  directoryClient: Queryable,
  blockchainRid: Buffer,
): Promise<string[]> {
  try {
    return await directoryClient.query(blockchainApiUrls(blockchainRid));
  } catch (error) {
    throw new SystemChainException(error.message);
  }
}

function blockchainApiUrls(
  blockchainRid: Buffer,
): QueryObject<string[], { blockchain_rid: Buffer }> {
  return {
    name: "cm_get_blockchain_api_urls",
    args: { blockchain_rid: blockchainRid },
  };
}

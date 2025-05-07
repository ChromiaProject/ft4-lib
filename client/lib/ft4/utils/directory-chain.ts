import { Buffer } from "buffer";
import {
  IClient,
  Queryable,
  QueryObject,
  SystemChainException,
  createClient,
  MERKLE_HASH_VERSIONS,
} from "postchain-client";

/**
 * Creates an IClient instance configured to run against the directory chain available
 * at the target url.
 * @param nodeUrlPool - the url to the cluster
 */
export async function getDirectoryClient(
  nodeUrlPool: string[],
): Promise<IClient> {
  return await createClient({
    nodeUrlPool,
    blockchainIid: 0,
    merkleHashVersion: MERKLE_HASH_VERSIONS.ONE,
  });
}

/**
 * Gets the blockchain rid of the system anchoring chain at the current cluster
 * @param directoryClient - client configured to the directory chain of which to get anchoring chain for
 */
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

/**
 * Retrieves the api urls that is available on for this blockchain
 * @param directoryClient - client configured to the directory chain of the cluster
 * @param blockchainRid - the blockchain rid of which to get urls for
 */
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

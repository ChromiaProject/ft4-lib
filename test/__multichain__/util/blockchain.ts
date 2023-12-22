import { createClient } from "postchain-client";
import { Blockchain } from "./types";

// The global cache variable
let blockchainsCache: { [key: string]: Blockchain } | null = null;

/**
 * Fetches blockchains from the client and structures them by name.
 * Caches the result for future calls.
 * @returns A dictionary of blockchains indexed by their names.
 */
async function fetchBlockchains(
  force = false,
): Promise<{ [key: string]: Blockchain }> {
  if (blockchainsCache && !force) {
    return blockchainsCache;
  }
  const client = await createClient({
    nodeUrlPool: "http://127.0.0.1:7740",
    blockchainIid: 0,
  });

  const result = await client.query<
    Blockchain[],
    { include_inactive: boolean }
  >("get_blockchains", {
    include_inactive: false,
  });

  const blockchains: { [key: string]: Blockchain } = {};
  result.forEach((blockchain) => {
    blockchains[blockchain.name] = blockchain;
  });
  blockchainsCache = blockchains;
  return blockchains;
}

/**
 * Retrieves blockchain data by its name.
 * @param name - The name of the blockchain to retrieve.
 * @returns The corresponding blockchain data.
 */
async function getBlockchainRid(name: string): Promise<Blockchain | undefined> {
  let blockchains = await fetchBlockchains();
  if (!blockchains?.[name]) {
    blockchains = await fetchBlockchains(true);
  }
  return blockchains[name];
}

export { fetchBlockchains, getBlockchainRid };

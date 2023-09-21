import { createClient } from "postchain-client";
import { Blockchain } from "./types";

// The global cache variable
let blockchainsCache: { [key: string]: Blockchain } | null = null;

/**
 * Fetches blockchains from the client and structures them by name.
 * @returns A dictionary of blockchains indexed by their names.
 */
async function fetchBlockchains(): Promise<{ [key: string]: Blockchain }> {
  const client = await createClient({
    nodeURLPool: "http://127.0.0.1:7740",
    blockchainIID: 0,
  });

  const result = await client.query<
    { include_inactive: boolean },
    Blockchain[]
  >("get_blockchains", {
    include_inactive: false,
  });

  const blockchains: { [key: string]: Blockchain } = {};
  result.forEach((blockchain) => {
    blockchains[blockchain.name] = blockchain;
  });
  return blockchains;
}

/**
 * Retrieves blockchain data by its name.
 * Caches the result for future calls.
 * @param name - The name of the blockchain to retrieve.
 * @returns The corresponding blockchain data.
 */
async function getBlockchainBrid(
  name: string,
): Promise<Blockchain | undefined> {
  if (!blockchainsCache?.[name]) {
    blockchainsCache = await fetchBlockchains();
  }
  return blockchainsCache[name];
}

export { fetchBlockchains, getBlockchainBrid };

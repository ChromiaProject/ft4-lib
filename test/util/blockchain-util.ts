import { Buffer } from "buffer";
import {
  createClient,
  gtv,
  IClient,
  formatter,
  Operation,
  BufferId,
  GTX,
  convertToRellOperation,
} from "postchain-client";
import { createConnection } from "@ft4/ft-session";
import { Asset } from "@ft4/asset/types";
import { registerAsset } from "@ft4/admin";
import { Blockchain } from "./types";
import { adminUser } from "./util";

export const NODE_URL = "http://localhost:7740";

export async function createChromiaClientToMultichain(
  blockchainRid: BufferId,
  nodeUrl?: string,
) {
  // const url = nodeUrl || process.env.TEST_NODE_URL || "http://127.0.0.1:7740";

  // const url = nodeUrl || "http://thedockerhost:7740";
  const url = nodeUrl || NODE_URL;
  return createClient({
    directoryNodeUrlPool: url,
    blockchainRid: blockchainRid.toString("hex"),
  });
}

export async function createChromiaClient(nodeUrl?: string, iid = 0) {
  const url =
    // nodeUrl || process.env.TEST_NODE_URL || "http://thedockerhost:7740";
    nodeUrl || process.env.TEST_NODE_URL || NODE_URL;
  return createClient({
    nodeUrlPool: url,
    blockchainIid: iid,
  });
}

export async function getNewAsset(
  client: IClient,
  name: string,
  symbol: string,
  decimals = 0,
  iconUrl = "",
): Promise<Asset> {
  const adminSignatureProvider = adminUser().signatureProvider;

  try {
    await registerAsset(
      client,
      adminSignatureProvider,
      name,
      symbol,
      decimals,
      iconUrl,
    );
  } catch (error) {
    console.log(`Asset with name ${name} already exists`);
  }

  const id = gtv.gtvHash(
    [name, formatter.ensureBuffer(client.config.blockchainRid)],
    client.config.merkleHashVersion,
  );
  const asset = await createConnection(client).getAssetById(id);
  if (!asset) {
    throw new Error("Unable to fetch the new asset");
  }
  return asset;
}

export async function addNewAssetIfNeeded(
  client: IClient,
  name: string,
  symbol: string,
  decimals = 0,
  iconUrl = "",
): Promise<Asset> {
  const id = gtv.gtvHash(
    [name, formatter.ensureBuffer(client.config.blockchainRid)],
    client.config.merkleHashVersion,
  );
  const asset = await createConnection(client).getAssetById(id);
  if (asset) {
    return asset;
  } else {
    try {
      return await getNewAsset(client, name, symbol, decimals, iconUrl);
    } catch (e) {
      // the asset was registered while this was running
      console.log(
        "Error during addNewAssetIfNeeded: has the asset been registered? " +
          "Falling back to querying the registered asset",
      );
      // wait for the block to be committed
      await new Promise((res) => {
        setTimeout(res, 1000);
      });
      const newAsset = await createConnection(client).getAssetById(id);
      if (!newAsset) {
        throw `Something weird happened during asset registration.
          Error: ${e}
          newAsset: ${newAsset}
          id: ${formatter.toString(id)}`;
      }
      return newAsset;
    }
  }
}

export function anchoredHandlerCallbackParameters(
  client: IClient,
  operations: Operation[],
) {
  return expect.objectContaining({
    tx: expect.objectContaining<GTX>({
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: convertToRellOperation(operations),
      signers: expect.any(Array),
      signatures: expect.any(Array),
    }),
  });
}

// The global cache variable
let blockchainsCache: { [key: string]: Blockchain } | null = null;

/**
 * Fetches blockchains from the client and structures them by name.
 * Caches the result for future calls.
 * @returns A dictionary of blockchains indexed by their names.
 */
export async function fetchBlockchains(
  force = false,
): Promise<{ [key: string]: Blockchain }> {
  if (blockchainsCache && !force) {
    return blockchainsCache;
  }
  const client = await createClient({
    // nodeUrlPool: "http://thedockerhost:7740",
    nodeUrlPool: NODE_URL,
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
export async function getBlockchainRidByName(
  name: string,
): Promise<Blockchain | undefined> {
  let blockchains = await fetchBlockchains();
  if (!blockchains?.[name]) {
    blockchains = await fetchBlockchains(true);
  }
  return blockchains[name];
}

import { Buffer } from "buffer";
import {
  createClient,
  gtv,
  IClient,
  formatter,
  Operation,
} from "postchain-client";
import { createConnection } from "@ft4/ft-session";
import { Asset } from "@ft4/asset/types";
import { registerAsset } from "@ft4/admin";
import { BufferId } from "@ft4/utils";
import { Blockchain } from "./types";
import { adminUser } from "./util";

export async function createChromiaClientToMultichain(
  blockchainRid: BufferId,
  nodeUrl?: string,
) {
  // const url = nodeUrl || process.env.TEST_NODE_URL || "http://127.0.0.1:7740";

  const url = nodeUrl || "http://thedockerhost:7740";
  return createClient({
    // directoryNodeUrlPool: url,
    nodeUrlPool: url,
    blockchainRid: blockchainRid.toString("hex"),
  });
}

export async function createChromiaClient(nodeUrl?: string, iid = 0) {
  const url =
    nodeUrl || process.env.TEST_NODE_URL || "http://thedockerhost:7740";
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
  await registerAsset(
    client,
    adminSignatureProvider,
    name,
    symbol,
    decimals,
    iconUrl,
  );
  const id = gtv.gtvHash([
    name,
    formatter.ensureBuffer(client.config.blockchainRid),
  ]);
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
  const id = gtv.gtvHash([
    name,
    formatter.ensureBuffer(client.config.blockchainRid),
  ]);
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
  opIndex: number,
) {
  return expect.objectContaining({
    operation: operations[opIndex],
    opIndex,
    tx: expect.arrayContaining([
      [
        Buffer.from(client.config.blockchainRid, "hex"),
        operations.map((o) => [o.name, o.args]),
        expect.any(Array),
      ],
      expect.any(Array),
    ]),
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
    nodeUrlPool: "http://thedockerhost:7740",
    blockchainIid: 0,
  });

  // const client2 = await createClient({
  //   nodeUrlPool: "http://thedockerhost:7740",
  //   blockchainRid:
  //     "a115380c08ea554b3e39afacee4c6a7e6d4d6d26974493a4ad102a48f0584951",
  // });

  // const temp = await client2.query<Blockchain[], { include_inactive: boolean }>(
  //   "rell.get_app_structure",
  // );

  // console.log("GET_APP_STRUCT FIRST");
  // console.log(temp);

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

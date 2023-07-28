import { IClient, createClient, formatter } from "postchain-client";
import { createConnection } from "../ft-session";
import { Connection } from "../types";
import { BufferId } from "/cryptoUtils";
import { Asset } from "../asset/types";
import { getAssetOriginById } from "./crosschain-query-functions";

export async function findPathToChain(
  connection: Connection,
  asset: Asset,
  blockchainRID: BufferId,
) {
  // could the root node be !== issuing_brid?
  // example:
  // - root is where x-chain txs happen, issuer is the game
  // so game isn't bogged down by x-chain txs but can still mint.
  // not supported yet by rell code
  const rootNode = formatter.toString(asset.brid);

  let foundPath = false;
  const pathSourceToRoot = [connection.client.config.blockchainRID];
  const pathEndToRoot = [
    typeof blockchainRID === "string"
      ? blockchainRID
      : formatter.toString(blockchainRID),
  ];

  let lastNode: string;
  let isSearchingSource = true;

  // Should we stop before N iterations?
  // Should we stop before T time delay?
  while (!foundPath) {
    const currentArray = isSearchingSource ? pathSourceToRoot : pathEndToRoot;

    lastNode = currentArray[currentArray.length - 1];

    if (lastNode !== rootNode) {
      const nextHop = formatter.toString(
        await getAssetOriginById(
          await createConnectionToBrid(connection.client, lastNode),
          asset.id,
        ),
      );
      currentArray.push(nextHop);
      if (
        (isSearchingSource ? pathEndToRoot : pathSourceToRoot).includes(nextHop)
      ) {
        foundPath = true;
        // possibly save the common node now if needed
        break;
      }
    }

    // switch branch only if the other hasn't reached root node yet
    isSearchingSource = isSearchingSource
      ? pathEndToRoot[pathEndToRoot.length - 1] === rootNode
      : pathSourceToRoot[pathSourceToRoot.length - 1] !== rootNode;
  }

  // you now have info, build the path
  // source -> common node -> end
}

async function createConnectionToBrid(oldClient: IClient, newBrid: BufferId) {
  return createConnection(
    await createClient({
      // assume same D1. Cross-chain doesn't work otherwise
      // ""+ to avoid errors (readonly)
      directoryNodeURLPool: "" + oldClient.config.endpointPool,
      blockchainRID:
        typeof newBrid == "string" ? newBrid : formatter.toString(newBrid),
    }),
  );
}

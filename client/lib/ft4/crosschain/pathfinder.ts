import { IClient, createClient, formatter } from "postchain-client";
// import { BlockchainUrlUndefinedException } from "postchain-client/built/src/chromia/errors";
import { createConnection } from "../ft-session";
import { Connection } from "../types";
import { BufferId } from "/cryptoUtils";
import { Asset } from "../asset/types";
import { getAssetOriginById } from "./crosschain-query-functions";

export class PathfinderError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "PathfinderError";
  }
}

export async function findPathToChain(
  connection: Connection,
  asset: Asset,
  blockchainRID: BufferId,
) {
  // could the root node be !== issuing_brid?
  // example:
  // - root is where x-chain txs happen, issuer is the game so
  //   game isn't slowed down by x-chain txs but can still mint
  //   without using ICMF/ICCF.
  //
  //                       Root dapp
  //                       /   |    \
  //                   game  dapp1  dapp2
  //
  //   game mints, dapp1 sends to dapp2 through root and not game
  const rootNode = formatter.toString(asset.brid);

  let foundPath = false;
  const pathSourceToRoot = [
    connection.client.config.blockchainRID.toUpperCase(),
  ];
  const pathEndToRoot = [
    (typeof blockchainRID === "string"
      ? blockchainRID
      : formatter.toString(blockchainRID)
    ).toUpperCase(),
  ];

  let lastNode: string;
  let commonNode: string;
  let isSearchingSource = true;

  // Should we stop before N iterations?
  // Should we stop before T time delay?
  while (!foundPath) {
    const currentArray = isSearchingSource ? pathSourceToRoot : pathEndToRoot;

    lastNode = currentArray[currentArray.length - 1];

    if (lastNode !== rootNode) {
      // Get the origin chain from the one we're currently exploring.
      // If the config is broken, two scenarios may arise:
      // 1. No origin chain. This call throws.
      // 2. The origin chain is a wrong brid.
      //    2a. If the chain doesn't exist at all, the next step on this branch will
      //        throw.
      //    2b. If the chain doesn't have the asset, the next step throws.
      //    2c. If the next chain is also the previous one (circular dependency),
      //        this loop would run indefinitely. (might be introduced by malice or error)
      //    2d. If the chain has the asset but no origin brid, next step is case 1
      //
      // let's consider these things:
      //
      // - set a max search depth for the path to avoid 2c and long trees
      // - check every brid on the list for circular dependencies to avoid 2c
      //   at the cost of speed
      let tmpConnection: Connection;

      try {
        tmpConnection = await createConnectionToBrid(
          connection.client,
          lastNode,
        );
      } catch (error) {
        // if (error instanceof BlockchainUrlUndefinedException) {
        throw new PathfinderError(
          `Blockchain ${lastNode} does not exist on the current network.`,
        );
        // } else {
        //   throw error;
        // }
      }

      // three possible errors:
      // 1. query does not exist
      // 2. asset does not exist
      // 3. asset is not a cross-chain asset (origin does not exist)
      //
      // all these errors are instances of UnexpectedStatusError
      // we either match on the message to rethrow or let it through unhandled
      const nextHop = formatter.toString(
        await getAssetOriginById(tmpConnection, asset.id),
      );

      currentArray.push(nextHop);
      if (
        (isSearchingSource ? pathEndToRoot : pathSourceToRoot).includes(nextHop)
      ) {
        foundPath = true;
        commonNode = nextHop;
        break;
      }
    }

    // switch branch only if the other hasn't reached root node yet
    isSearchingSource = isSearchingSource
      ? pathEndToRoot[pathEndToRoot.length - 1] === rootNode
      : pathSourceToRoot[pathSourceToRoot.length - 1] !== rootNode;
  }

  const pathRootToEnd = pathEndToRoot.reverse();

  return pathSourceToRoot
    .slice(
      1, // remove the starting chain
      pathSourceToRoot.indexOf(commonNode),
    )
    .concat(pathRootToEnd.slice(pathRootToEnd.indexOf(commonNode)));
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

import { IClient, createClient, formatter } from "postchain-client";
// import { BlockchainUrlUndefinedException } from "postchain-client/built/src/chromia/errors";
import { createConnection } from "../ft-session";
import { Connection } from "../types";
import { BufferId } from "/cryptoUtils";
import { Buffer } from "buffer";
import { Asset } from "../asset/types";
import { getAssetOriginById } from "./crosschain-query-functions";

export class PathfinderError extends Error {
  constructor(msg?) {
    super(msg);
    this.name = "PathfinderError";
  }
}

export async function findPathToChainForAsset(
  connection: Connection,
  asset: Asset,
  blockchainRID: BufferId,
  maxPathLength = 100,
): Promise<Buffer[]> {
  const rootNode = asset.brid;

  const pathSourceToRoot = [
    formatter.toBuffer(connection.client.config.blockchainRID),
  ];
  const pathEndToRoot = [formatter.ensureBuffer(blockchainRID)];

  let lastNode: Buffer;
  let commonNode: Buffer;
  let isSearchingSource = true;

  let pathLength = 0;
  for (; pathLength < maxPathLength; ++pathLength) {
    const currentArray = isSearchingSource ? pathSourceToRoot : pathEndToRoot;

    lastNode = currentArray[currentArray.length - 1];

    if (lastNode.compare(rootNode)) {
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
        throw new PathfinderError(
          `Blockchain ${lastNode.toString(
            "hex",
          )} does not exist on the current network.`,
        );
      }

      // three possible errors:
      // 1. query does not exist
      // 2. asset does not exist
      // 3. asset is not a cross-chain asset (origin does not exist)
      //
      // The first two errors are instances of UnexpectedStatusError
      // we either match on the message to rethrow or let it through unhandled
      const nextHop = await getAssetOriginById(tmpConnection, asset.id);

      if (nextHop === null) {
        throw new PathfinderError(
          `The asset is not a cross-chain asset on chain ${lastNode.toString(
            "hex",
          )}`,
        );
      }

      currentArray.push(nextHop);
      if (
        (isSearchingSource ? pathEndToRoot : pathSourceToRoot).some(
          (x) => !x.compare(nextHop),
        )
      ) {
        commonNode = nextHop;
        break;
      }
    }

    if (pathLength === maxPathLength - 1) {
      throw new PathfinderError(
        `Exceeded max path length of ${maxPathLength} hops. This is most likely due to an error in your code, but if you really need a larger path length, you can increase the default by passing the new max path length as an argument to this function`,
      );
    }

    // switch branch only if the other hasn't reached root node yet
    isSearchingSource = isSearchingSource
      ? !pathEndToRoot[pathEndToRoot.length - 1].compare(rootNode)
      : !!pathSourceToRoot[pathSourceToRoot.length - 1].compare(rootNode);
  }

  const pathRootToEnd = pathEndToRoot.reverse();

  return pathSourceToRoot
    .slice(
      0,
      pathSourceToRoot.findIndex((x) => !x.compare(commonNode)),
    )
    .concat(
      pathRootToEnd.slice(
        pathRootToEnd.findIndex((x) => !x.compare(commonNode)),
      ),
    )
    .slice(1); // remove starting chain
}

export async function createConnectionToBrid(
  oldClient: IClient,
  newBrid: BufferId,
) {
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

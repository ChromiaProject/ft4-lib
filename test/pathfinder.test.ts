// Not BRIDS, but allows for easier testing
const startingChainBrid = "STARTING CHAIN";
const endingChainBrid = "ENDING CHAIN";
const rootChainBrid = "ROOT CHAIN";
const commonChainBrid = "COMMON CHAIN";

const assetOriginQueryMock = jest.fn();
const createClientMock = jest.fn();

jest.mock("/ft4/crosschain/crosschain-query-functions", () => {
  const originalModule = jest.requireActual(
    "/ft4/crosschain/crosschain-query-functions",
  );

  return {
    __esModule: true,
    ...originalModule,
    getAssetOriginById: assetOriginQueryMock,
  };
});
jest.mock("postchain-client", () => {
  const originalModule = jest.requireActual("postchain-client");

  return {
    __esModule: true,
    ...originalModule,
    createClient: createClientMock,
  };
});

import { generateId } from "./util/util";
import { IClient } from "postchain-client";
import { Connection } from "/ft4/types";
import { createChromiaClient } from "./util/blockchain-util";
import { createConnection } from "/ft4";
import { Asset } from "/ft4/asset/types";
import { PathfinderError, findPathToChain } from "/ft4/crosschain/pathfinder";

createClientMock.mockImplementation(
  async () =>
    ({
      config: {
        // we need this to create new clients from the old one
        endpointPool: [""],
        // this gives us the starting point, always the same
        blockchainRID: startingChainBrid,
      },
    }) as unknown as IClient,
);
let connection: Connection;

describe("Pathfinder", () => {
  beforeAll(async () => {
    connection = createConnection(await createChromiaClient());
  });

  beforeEach(async () => {
    assetOriginQueryMock.mockReset();
  });

  it("finds a path", async () => {
    const asset = getMockAsset();
    setPathsByLength(3, 2, 2, asset.brid.toString("hex"));
    const path = await findPathToChain(connection, asset, endingChainBrid);

    expect(path.length).toEqual(5);
  });

  it("finds a path with no duplicate hops", async () => {
    const asset = getMockAsset();
    setPathsByLength(3, 2, 2, asset.brid.toString("hex"));
    const path = await findPathToChain(connection, asset, endingChainBrid);

    expect(path.length).toEqual(5);
    expect(new Set(path).size).toEqual(path.length);
  });

  it("finds a path through root if no common nodes exist", async () => {
    const asset = getMockAsset();
    setPathsByLength(7, 3, 0, asset.brid.toString("hex"));
    const path = await findPathToChain(connection, asset, endingChainBrid);

    expect(path.length).toEqual(10);
  });

  it("throws when blockchain doesn't exist", async () => {
    const asset = getMockAsset();
    assetOriginQueryMock.mockReturnValueOnce(generateId());
    createClientMock.mockImplementationOnce(
      jest.requireActual("postchain-client").createClient,
    );
    const promise = findPathToChain(connection, asset, endingChainBrid);

    await expect(promise).rejects.toThrow(PathfinderError);
  });
});

function setPaths(startToRoot: string[], endToRoot: string[]) {
  const zippedArray = Array.from(
    // Array as long as the biggest of the two
    { length: Math.max(startToRoot.length, endToRoot.length) },
    // fill it with tuples of elements from the two arrays
    // some will be undefined
    (_, i) => [startToRoot[i], endToRoot[i]],
    // unpack tuples and remove undefined values
  )
    .flat()
    .filter((x) => x !== undefined);

  zippedArray.map((nextBrid) =>
    // changes return type for tests, but allows usage of explicit strings
    // defined on top of the file.
    assetOriginQueryMock.mockReturnValueOnce(nextBrid),
  );
}

// A-B-C-X-Y-Z
//      /
//   D-E
// Sending A->D with X in common and
// Z as root, will have these parameters
// (3, 2, 2, Z.brid.toString("hex"))
function setPathsByLength(
  startToCommonHops: number,
  endToCommonHops: number,
  commonToRootHops: number,
  rootBrid: string,
) {
  // X-Y-Z
  const commonToRootArray = commonToRootHops
    ? [commonChainBrid]
        .concat(
          Array.from({ length: commonToRootHops - 1 }, () =>
            generateId().toString("hex"),
          ),
        )
        .concat(rootBrid)
    : [rootBrid];

  //B-C-X-Y-Z
  const startToRoot = Array.from({ length: startToCommonHops - 1 }, () =>
    generateId().toString("hex"),
  ).concat(commonToRootArray);

  //E-X-Y-Z
  const endToRoot = Array.from({ length: endToCommonHops - 1 }, () =>
    generateId().toString("hex"),
  ).concat(commonToRootArray);

  setPaths(startToRoot, endToRoot);
}

function getMockAsset() {
  return {
    id: generateId(),
    brid: rootChainBrid,
  } as unknown as Asset;
}

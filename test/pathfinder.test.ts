// Not BRIDS, but allows for easier testing
const startingChainBrid = Buffer.from("00", "hex");
const endingChainBrid = Buffer.from("ff", "hex");
const rootChainBrid = Buffer.from("11", "hex");
const commonChainBrid = Buffer.from("88", "hex");

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
import { IClient, formatter } from "postchain-client";
import { Connection } from "/ft4/types";
import { createChromiaClient } from "./util/blockchain-util";
import { createConnection } from "/ft4";
import { Asset } from "/ft4/asset/types";
import { PathfinderError, findPathToChain } from "/ft4/crosschain/pathfinder";
import { BufferId } from "/cryptoUtils";

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
    setOriginAssetsQueryResponsesByLength(3, 2, 2, asset.brid.toString("hex"));
    // start
    //   ↳ 2           end
    //     ↳ 3        4 ↲
    //       ↳ common ↲
    //           ↳ 1
    //             ↳ root
    const path = await findPathToChain(connection, asset, endingChainBrid);

    expect(path.map((buf) => buf.toString("hex"))).toEqual([
      "2222",
      "3333",
      commonChainBrid.toString("hex"),
      "4444",
      endingChainBrid.toString("hex"),
    ]);
  });

  it("finds a path with no duplicate hops", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponsesByLength(3, 2, 2, asset.brid.toString("hex"));
    const path = await findPathToChain(connection, asset, endingChainBrid);

    expect(path.length).toEqual(5);
    expect(new Set(path).size).toEqual(path.length);
  });

  it("finds a path through root if no common nodes exist", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponsesByLength(7, 3, 0, asset.brid.toString("hex"));
    const path = await findPathToChain(connection, asset, endingChainBrid);

    expect(path.map((buf) => buf.toString("hex"))).toEqual([
      "1111",
      "2222",
      "3333",
      "4444",
      "5555",
      "6666",
      rootChainBrid.toString("hex"),
      "8888",
      "7777",
      endingChainBrid.toString("hex"),
    ]);
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

  it("finds a path if both are on the same branch", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponses(
      [
        "1111",
        "2222",
        "3333",
        "4444",
        endingChainBrid,
        "5555",
        "6666",
        rootChainBrid,
      ],
      ["5555", "6666", rootChainBrid],
    );
    const path = await findPathToChain(connection, asset, endingChainBrid);

    expect(path.map((buf) => buf.toString("hex"))).toEqual([
      "1111",
      "2222",
      "3333",
      "4444",
      endingChainBrid.toString("hex"),
    ]);
  });

  it("works when second node is downstream of first node", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponses(
      ["5555", "6666", rootChainBrid],
      [
        "1111",
        "2222",
        "3333",
        "4444",
        startingChainBrid,
        "5555",
        "6666",
        rootChainBrid,
      ],
    );
    const path = await findPathToChain(connection, asset, endingChainBrid);

    expect(path.map((buf) => buf.toString("hex"))).toEqual([
      "4444",
      "3333",
      "2222",
      "1111",
      endingChainBrid.toString("hex"),
    ]);
  });
});

function setOriginAssetsQueryResponses(
  startToRoot: BufferId[],
  endToRoot: BufferId[],
) {
  for (let i = 0; i < Math.max(startToRoot.length, endToRoot.length); i++) {
    if (i < startToRoot.length) {
      assetOriginQueryMock.mockReturnValueOnce(
        formatter.ensureBuffer(startToRoot[i]),
      );
    }

    if (i < endToRoot.length) {
      assetOriginQueryMock.mockReturnValueOnce(
        formatter.ensureBuffer(endToRoot[i]),
      );
    }
  }
}

// A-B-C-X-Y-Z
//      /
//   D-E
// Sending A->D with X in common and
// Z as root, will have these parameters
// (3, 2, 2, Z.brid)
function setOriginAssetsQueryResponsesByLength(
  startToCommonHops: number,
  endToCommonHops: number,
  commonToRootHops: number,
  rootBrid: BufferId,
) {
  let i = 0;
  const nextChain = () => Buffer.from(String(++i).repeat(4), "hex");
  // X-Y-Z
  const commonToRootArray = commonToRootHops
    ? [commonChainBrid]
        .concat(Array.from({ length: commonToRootHops - 1 }, nextChain))
        .concat(formatter.ensureBuffer(rootBrid))
    : [formatter.ensureBuffer(rootBrid)];

  //B-C-X-Y-Z
  const startToRoot = Array.from(
    { length: startToCommonHops - 1 },
    nextChain,
  ).concat(commonToRootArray);

  //E-X-Y-Z
  const endToRoot = Array.from(
    { length: endToCommonHops - 1 },
    nextChain,
  ).concat(commonToRootArray);

  setOriginAssetsQueryResponses(startToRoot, endToRoot);
}

function getMockAsset() {
  return {
    id: generateId(),
    brid: rootChainBrid,
  } as unknown as Asset;
}

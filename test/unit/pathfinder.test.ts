import { Buffer } from "buffer";

// Not Blockchain RIDs, but allows for easier testing
const startingChainRid = Buffer.from("00", "hex");
const endingChainRid = Buffer.from("ff", "hex");
const rootChainRid = Buffer.from("11", "hex");
const commonChainRid = Buffer.from("88", "hex");

const assetOriginQueryMock = jest.fn();
const createClientMock = jest.fn();

jest.mock("@ft4/crosschain/query-functions", () => {
  const originalModule = jest.requireActual("@ft4/crosschain/query-functions");

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

import { generateId } from "../util/util";
import {
  createClient,
  IClient,
  MissingNodeUrlError,
  formatter,
} from "postchain-client";
import { Connection } from "@ft4/types";
import { createConnection } from "@ft4/index";
import { Asset } from "@ft4/asset/types";
import { findPathToChainForAsset } from "@ft4/crosschain/pathfinder";
import { BufferId } from "@ft4/utils/types";

createClientMock.mockImplementation(
  async () =>
    ({
      config: {
        // we need this to create new clients from the old one
        endpointPool: [""],
        // this gives us the starting point, always the same
        blockchainRid: startingChainRid,
      },
    }) as unknown as IClient,
);
let connection: Connection;

describe("Pathfinder", () => {
  beforeAll(async () => {
    const client = await createClient({
      nodeUrlPool: "",
      blockchainRid: formatter.toString(startingChainRid),
    });
    connection = createConnection(client);
  });

  beforeEach(async () => {
    assetOriginQueryMock.mockReset();
  });

  it("finds a path", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponsesByLength(
      3,
      2,
      2,
      asset.blockchainRid.toString("hex"),
    );
    // start
    //   ↳ 2           end
    //     ↳ 3        4 ↲
    //       ↳ common ↲
    //           ↳ 1
    //             ↳ root
    const path = await findPathToChainForAsset(
      connection,
      asset,
      endingChainRid,
    );

    expect(path.map((buf) => buf.toString("hex"))).toEqual([
      "2222",
      "3333",
      commonChainRid.toString("hex"),
      "4444",
      endingChainRid.toString("hex"),
    ]);
  });

  it("finds a path with no duplicate hops", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponsesByLength(
      3,
      2,
      2,
      asset.blockchainRid.toString("hex"),
    );
    const path = await findPathToChainForAsset(
      connection,
      asset,
      endingChainRid,
    );

    expect(path.length).toEqual(5);
    expect(new Set(path).size).toEqual(path.length);
  });

  it("finds a path through root if no common nodes exist", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponsesByLength(
      7,
      3,
      0,
      asset.blockchainRid.toString("hex"),
    );
    const path = await findPathToChainForAsset(
      connection,
      asset,
      endingChainRid,
    );

    expect(path.map((buf) => buf.toString("hex"))).toEqual([
      "1111",
      "2222",
      "3333",
      "4444",
      "5555",
      "6666",
      rootChainRid.toString("hex"),
      "8888",
      "7777",
      endingChainRid.toString("hex"),
    ]);
  });

  it("rethrows errors when it can't handle them", async () => {
    const asset = getMockAsset();
    assetOriginQueryMock.mockReturnValueOnce(generateId(2));
    createClientMock.mockImplementationOnce(
      jest.requireActual("postchain-client").createClient,
    );
    const promise = findPathToChainForAsset(connection, asset, endingChainRid);

    await expect(promise).rejects.toThrow(MissingNodeUrlError);
  });

  it("finds a path if both are on the same branch", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponses(
      [
        "1111",
        "2222",
        "3333",
        "4444",
        endingChainRid,
        "5555",
        "6666",
        rootChainRid,
      ],
      ["5555", "6666", rootChainRid],
    );
    const path = await findPathToChainForAsset(
      connection,
      asset,
      endingChainRid,
    );

    expect(path.map((buf) => buf.toString("hex"))).toEqual([
      "1111",
      "2222",
      "3333",
      "4444",
      endingChainRid.toString("hex"),
    ]);
  });

  it("works when second node is downstream of first node", async () => {
    const asset = getMockAsset();
    setOriginAssetsQueryResponses(
      ["5555", "6666", rootChainRid],
      [
        "1111",
        "2222",
        "3333",
        "4444",
        startingChainRid,
        "5555",
        "6666",
        rootChainRid,
      ],
    );
    const path = await findPathToChainForAsset(
      connection,
      asset,
      endingChainRid,
    );

    expect(path.map((buf) => buf.toString("hex"))).toEqual([
      "4444",
      "3333",
      "2222",
      "1111",
      endingChainRid.toString("hex"),
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
// (3, 2, 2, Z.blockchainRid)
function setOriginAssetsQueryResponsesByLength(
  startToCommonHops: number,
  endToCommonHops: number,
  commonToRootHops: number,
  rootBlockchainRid: BufferId,
) {
  let i = 0;
  const nextChain = () => Buffer.from(String(++i).repeat(4), "hex");
  // X-Y-Z
  const commonToRootArray = commonToRootHops
    ? [commonChainRid]
        .concat(Array.from({ length: commonToRootHops - 1 }, nextChain))
        .concat(formatter.ensureBuffer(rootBlockchainRid))
    : [formatter.ensureBuffer(rootBlockchainRid)];

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
    id: generateId(3),
    blockchainRid: rootChainRid,
  } as unknown as Asset;
}

const assetOriginQueryMock = jest.fn();

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

import { generateId } from "../../../util/util";
import { fetchBlockchains } from "/__multichain__/utils/blockchain";
import { createConnection } from "/ft4";
import {
  PathfinderError,
  findPathToChainForAsset,
} from "/ft4/crosschain/pathfinder";
import { Connection } from "/ft4/types";
import {
  createChromiaClientToMultichain,
  getNewAsset,
} from "/util/blockchain-util";

const connections: Connection[] = [];

describe("Pathfinder", () => {
  beforeAll(async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    connections[0] = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    connections[1] = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );
  });

  beforeEach(async () => {
    assetOriginQueryMock.mockReset();
  });

  it("throws PathfinderError when a chain doesn't exist", async () => {
    const asset00 = await getNewAsset(connections[0].client);

    assetOriginQueryMock.mockReturnValueOnce(generateId());
    const promise = findPathToChainForAsset(
      connections[0],
      asset00,
      connections[1].client.config.blockchainRid,
    );

    await expect(promise).rejects.toThrow(PathfinderError);
  });
});

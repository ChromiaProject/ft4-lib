import {
  adminUser,
  createChromiaClientToMultichain,
  fetchBlockchains,
  generateId,
  getNewAsset,
  mapAssetToCrosschainAssetRegistration,
  registerCrosschainAsset,
} from "@ft4-test/util";
import { PathfinderError, findPathToChainForAsset } from "@ft4/crosschain";
import { Connection, createConnection } from "@ft4/ft-session";

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

  it("throws PathfinderError when a chain doesn't exist", async () => {
    const asset00 = await getNewAsset(
      connections[0].client,
      "pathfinder",
      "PATHFINDER",
    );

    await registerCrosschainAsset(
      connections[1],
      adminUser().signatureProvider,
      mapAssetToCrosschainAssetRegistration(asset00),
      generateId(1),
    );

    const promise = findPathToChainForAsset(
      connections[1],
      asset00,
      connections[0].client.config.blockchainRid,
    );

    await expect(promise).rejects.toThrow(PathfinderError);
  });
});

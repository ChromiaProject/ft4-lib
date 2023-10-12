import { generateId } from "../../../util/util";
import { fetchBlockchains } from "/__multichain__/util/blockchain";
import { createConnection, registerCrosschainAsset } from "/ft4";
import {
  PathfinderError,
  findPathToChainForAsset,
} from "/ft4/crosschain/pathfinder";
import { Connection } from "/ft4/types";
import adminUser from "/util/admin_user";
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

  it("throws PathfinderError when a chain doesn't exist", async () => {
    const asset00 = await getNewAsset(connections[0].client);
    await registerCrosschainAsset(
      connections[1].client,
      adminUser().signatureProvider,
      asset00,
      generateId(),
    );

    const promise = findPathToChainForAsset(
      connections[1],
      asset00,
      connections[0].client.config.blockchainRid,
    );

    await expect(promise).rejects.toThrow(PathfinderError);
  });
});

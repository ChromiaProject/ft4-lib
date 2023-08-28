import { IClient } from "postchain-client";
import { createChromiaClient } from "/util/blockchain-util";

interface Blockchain {
  name: string;
  rid: Buffer;
  state: string;
  system: number;
}

describe("Multichain initialization", () => {
  let client: IClient;

  beforeAll(async () => {
    client = await createChromiaClient();
  });

  test("multiple blockchains are hosted by the node", async () => {
    const blockchains = (await client.query("get_blockchains", {
      include_inactive: false,
    })) as unknown as Blockchain[];

    // Check for the presence of system blockchains
    const systemBlockchains = [
      "c0",
      "system_anchoring",
      "cluster_anchoring_system",
    ];
    const presentBlockchains = blockchains.map((blockchain) => blockchain.name);
    systemBlockchains.forEach((name) => {
      expect(presentBlockchains).toContain(name);
    });

    // Check if there are more than one "multichainNN" blockchains
    const multichainBlockchains = blockchains.filter((blockchain) =>
      /^multichain\d\d$/.test(blockchain.name),
    );
    expect(multichainBlockchains.length).toBeGreaterThan(1);
  });
});

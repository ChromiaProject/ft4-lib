import { fetchBlockchains } from "@ft4-test/util";

describe("Multichain initialization", () => {
  test("multiple blockchains are hosted by the node", async () => {
    const blockchainsData = await fetchBlockchains();
    const blockchains = Object.values(blockchainsData);

    // Check for the presence of system blockchains
    const systemBlockchains = [
      "directory_chain",
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

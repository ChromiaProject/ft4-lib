import { IClient } from "postchain-client";
import { createChromiaClient } from "/util/blockchain-util";

describe("Multichain initialization", () => {
  let client: IClient;

  beforeAll(async () => {
    client = await createChromiaClient();
  });

  test.skip("multiple blockchains are hosted by the node", async () => {
    const blockchains = await client.query("get_blockchains", {
      include_inactive: false,
    });

    // Check if there are more than one blockchains
    expect(blockchains).toBeGreaterThan(1);

    // Check if all names match the pattern "multichain\d\d"
    // const namesMatch = blockchains.every((blockchain) => /^multichain\d\d$/.test(blockchain.name));
    // expect(namesMatch).toBe(true);
  });
});

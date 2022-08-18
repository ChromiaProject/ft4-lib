import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import Postchain from "../client/lib/ft3/core/postchain";

let blockchain: Blockchain;

describe("Postchain", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should instantiate blockchain by passing internal chain id as a number", async () => {
    const url = process.env.TEST_NODE_URL || "http://localhost:7741";
    const blockchain1 = await new Postchain(url).blockchain(0);

    expect(blockchain1.info).toEqual(blockchain.info);
  });

  it("should instantiate blockchain by passing BRID as a string", async () => {
    const url = process.env.TEST_NODE_URL || "http://localhost:7741";
    const blockchain1 = await new Postchain(url).blockchain(
      blockchain.id.toString("hex")
    );

    expect(blockchain1.info).toEqual(blockchain.info);
  });

  it("should instantiate blockchain by passing BRID as a Buffer", async () => {
    const url = process.env.TEST_NODE_URL || "http://localhost:7741";
    const blockchain1 = await new Postchain(url).blockchain(blockchain.id);

    expect(blockchain1.info).toEqual(blockchain.info);
  });
});

import BlockchainUtil from "./util/blockchain-util";
import { Blockchain } from "../client/lib/ft3";
import Postchain from "../client/lib/ft3/core/postchain";

let blockchain: Blockchain;

describe("Postchain", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should instantiate blockchain by passing internal chain id as a number", async () => {
    const url = process.env.TEST_NODE_URL || "http://localhost:7741";
    const blockchain1 = await new Postchain([url]).blockchain(0);
    const info = await blockchain.getChainInfo();
    const info1 = await blockchain1.getChainInfo();

    expect(info1).toEqual(info);
  });

  it("should instantiate blockchain by passing BRID as a string", async () => {
    const url = process.env.TEST_NODE_URL || "http://localhost:7741";
    const blockchain1 = await new Postchain([url]).blockchain(
      blockchain.id.toString("hex")
    );
    const info = await blockchain.getChainInfo();
    const info1 = await blockchain1.getChainInfo();

    expect(info1).toEqual(info);
  });

  it("should instantiate blockchain by passing BRID as a Buffer", async () => {
    const url = process.env.TEST_NODE_URL || "http://localhost:7741";
    const blockchain1 = await new Postchain([url]).blockchain(blockchain.id);
    const info = await blockchain.getChainInfo();
    const info1 = await blockchain1.getChainInfo();

    expect(info1).toEqual(info);
  });
});

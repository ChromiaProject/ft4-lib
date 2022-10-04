import { BlockchainInfo, Blockchain, RateLimitInfo } from "../client/lib/ft3";
import BlockchainUtil from "./util/blockchain-util";

let blockchain: Blockchain;
const POINTS_AT_ACCOUNT_CREATION = 1;

describe("Blockchain", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should provide info", async () => {
    const info = await BlockchainInfo.getInfo(blockchain.connection);

    expect(info).toEqual(
      new BlockchainInfo(
        "testnet ft3",
        "https://vault-testnet.chromia.com/",
        "FT3 vault DEVELOPMENT MODE - TESTNET",
        new RateLimitInfo(true, 20, 60000, POINTS_AT_ACCOUNT_CREATION)
      )
    );
  });
});

import BlockchainInfo from "../client/lib/ft3/core/blockchain/blockchain-info";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import TestUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { generateAssetName, generateId } from "./util/util";
import BlockchainUtil from "./util/blockchain-util";
import { Account, RateLimitInfo } from "../client/lib/ft3";
import { TestnetAsset as Asset } from "./testnetAdmin/testnet-asset";

let blockchain: Blockchain = null;
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

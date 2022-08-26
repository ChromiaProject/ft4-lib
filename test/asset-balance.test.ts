import AccountBuilder from "./util/account-builder";
import AssetBalance from "../client/lib/ft3/user/asset-balance";
import Asset from "../client/lib/ft3/user/asset";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";

let blockchain: Blockchain;
let asset1: Asset;
let asset2: Asset;

describe("Asset balance", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
    asset1 = await BlockchainUtil.getNewAsset(blockchain);
    asset2 = await BlockchainUtil.getNewAsset(blockchain);
  });

  it("should be returned when queried by account id", async () => {
    const account = await AccountBuilder.account(blockchain)
      .withBalances([
        new AssetBalance(10, asset1),
        new AssetBalance(20, asset2),
      ])
      .build();

    const assets = await AssetBalance.getByAccountId(account.id, blockchain);

    expect(assets.length).toEqual(2);
  });
});

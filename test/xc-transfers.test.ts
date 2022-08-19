import AccountBuilder from "./util/account-builder";
import { blockchainAccountId, generateId } from "./util/util";
import Asset from "../client/lib/ft3/user/asset";
import AssetBalance from "../client/lib/ft3/user/asset-balance";
import TestUser from "./util/test-user";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";

let blockchain: Blockchain = null;
let asset: Asset = null;

describe.skip("Cross-chain transfer", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
    asset = await BlockchainUtil.getNewAsset(blockchain);
  });

  it("should succeessfully initialize when there's enough balance on the account", async () => {
    const destinationBRID = generateId();
    const destinationAccountId = generateId();
    const user = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 100)
      .withPoints(1)
      .build();

    await account.xcTransfer(
      destinationBRID,
      destinationAccountId,
      asset.id,
      10
    );

    const accountBalance = await AssetBalance.getByAccountAndAssetId(
      account.id,
      asset.id,
      blockchain
    );
    const chainBalance = await AssetBalance.getByAccountAndAssetId(
      blockchainAccountId(destinationBRID),
      asset.id,
      blockchain
    );

    expect(accountBalance.amount).toEqual(90);
    expect(chainBalance.amount).toEqual(10);
  });
});
